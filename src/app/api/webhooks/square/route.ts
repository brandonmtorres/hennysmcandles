import { NextResponse } from 'next/server'
import type { Square } from 'square'
import { db } from '@/lib/db'
import { getSquare, centsOf } from '@/lib/square/client'
import { squareEventSchema, verifySquareSignature } from '@/lib/square/webhook'
import { getSettings } from '@/lib/settings'
import { nextOrderNumber } from '@/lib/order-number'
import { sendEmail } from '@/lib/email/send'
import {
  lowStockEmail,
  orderConfirmationEmail,
  ownerNewOrderEmail,
  type OrderEmailData,
} from '@/lib/email/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Square webhook receiver — the single source of truth for order creation.
 *
 * Why everything happens here rather than on the success page:
 *  · The success page can be closed, refreshed, or never loaded at all. A
 *    webhook is delivered regardless, and retried until acknowledged.
 *  · The payload is cryptographically signed, so it cannot be forged. A
 *    customer hitting the success URL directly proves nothing.
 *  · Stock is decremented inside a database transaction alongside order
 *    creation, so an order can never exist without its stock movement.
 *
 * Two rules specific to Square:
 *
 *  1. The notification is treated as a *pointer*, never as data. It says which
 *     payment changed; the amounts are then read back from Square's API. The
 *     event body is snake_case and partial, and reconstructing money from it
 *     invites a mistake that only shows up in someone's bank statement.
 *
 *  2. **An order is created only when a CheckoutSession matches it.** The same
 *     Square account rings up candles at markets, and those in-person payments
 *     raise identical `payment.updated` events. Without this rule every sale
 *     made on the stall would appear as an unfulfilled web order with no
 *     address and would decrement online stock.
 *
 * Idempotency: every event id is recorded, the order carries a unique
 * constraint on the Square order id, and refunds are reconciled against the
 * payment's cumulative refunded total rather than being added up event by
 * event — so a replay cannot double-decrement or double-refund.
 */
export async function POST(request: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL

  if (!signatureKey || !notificationUrl) {
    console.error(
      '[webhook] SQUARE_WEBHOOK_SIGNATURE_KEY or SQUARE_WEBHOOK_URL is not set — rejecting.',
    )
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('x-square-hmacsha256-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  // The raw body is required — parsing it first would break signature checking.
  const payload = await request.text()

  if (
    !verifySquareSignature({
      body: payload,
      signature,
      notificationUrl,
      signatureKey,
    })
  ) {
    console.error('[webhook] Signature verification failed.')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let json: unknown
  try {
    json = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 })
  }

  const parsed = squareEventSchema.safeParse(json)
  if (!parsed.success) {
    console.error('[webhook] Unrecognised event shape.')
    return NextResponse.json({ error: 'Unrecognised event.' }, { status: 400 })
  }
  const event = parsed.data

  // Already handled? Acknowledge and stop.
  const seen = await db.processedWebhook.findUnique({ where: { id: event.event_id } })
  if (seen) return NextResponse.json({ received: true, duplicate: true })

  try {
    switch (event.type) {
      case 'payment.created':
      case 'payment.updated':
        await handlePayment(event.data.id)
        break
      case 'refund.created':
      case 'refund.updated':
        await handleRefund(event.data.id)
        break
      default:
        break
    }

    await db.processedWebhook.create({ data: { id: event.event_id, type: event.type } })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[webhook] Handler failed for ${event.type}:`, error)
    // A non-2xx tells Square to retry, which is what we want on a transient fault.
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------

/**
 * Whether an error from Square means "this will never exist".
 *
 * The distinction matters because our answer decides whether Square retries.
 * A network blip or a 5xx deserves a 500 from us and another attempt. A 404
 * does not: the object is not coming, and a webhook we answer 500 to forever
 * is retried until Square disables the subscription — taking real orders down
 * with it. Square's own "send test event" button is exactly this case, since
 * it references an id that was never real.
 */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { statusCode?: number }).statusCode === 404
  )
}

/** Fetches from Square, treating "never existed" as an answer rather than a fault. */
async function fetchOrNull<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher()
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

async function handlePayment(paymentId: string) {
  const found = await fetchOrNull(() => getSquare().payments.get({ paymentId }))
  if (!found) {
    console.info(`[webhook] Payment ${paymentId} does not exist; nothing to do.`)
    return
  }

  const { payment } = found
  if (!payment || payment.status !== 'COMPLETED') return

  const squareOrderId = payment.orderId
  if (!squareOrderId) return

  // An order for this Square order already exists — record the payment id if
  // this is the first completed payment we have seen, then stop.
  const existing = await db.order.findUnique({ where: { squareOrderId } })
  if (existing) {
    if (!existing.squarePaymentId && payment.id) {
      await db.order.update({
        where: { id: existing.id },
        data: { squarePaymentId: payment.id },
      })
    }
    return
  }

  // The quote we wrote before sending the customer to Square. No quote means
  // this payment did not come from the website — an in-person sale, most
  // likely — and must not become a web order.
  const session = await db.checkoutSession.findUnique({ where: { squareOrderId } })
  if (!session) {
    console.info(
      `[webhook] Payment ${payment.id} has no checkout session; not a web order.`,
    )
    return
  }

  const fetchedOrder = await fetchOrNull(() =>
    getSquare().orders.get({ orderId: squareOrderId }),
  )
  const squareOrder = fetchedOrder?.order
  if (!squareOrder) {
    console.error(`[webhook] Order ${squareOrderId} could not be read; skipping.`)
    return
  }

  // Square's figures are what the customer was actually charged, so they are
  // what the order records. Ours are the quote, and any disagreement is a bug
  // worth surfacing rather than papering over.
  const totalCents = centsOf(squareOrder.totalMoney)
  const taxCents = centsOf(squareOrder.totalTaxMoney)
  const discountCents = centsOf(squareOrder.totalDiscountMoney)
  const shippingCents = centsOf(squareOrder.totalServiceChargeMoney)
  const subtotalCents = totalCents - taxCents - shippingCents + discountCents

  const recipient = squareOrder.fulfillments?.[0]?.shipmentDetails?.recipient
  const address = payment.shippingAddress ?? recipient?.address ?? null

  const email =
    payment.buyerEmailAddress ?? recipient?.emailAddress ?? 'unknown@unknown.invalid'
  const name =
    recipient?.displayName ??
    [address?.firstName, address?.lastName].filter(Boolean).join(' ') ??
    null

  // Flagged when the destination Square collected is not the one tax was
  // charged against, or when the totals disagree with the quote. The owner
  // resolves these by hand; silently "correcting" a completed payment would
  // only hide the problem.
  const collectedState = address?.administrativeDistrictLevel1?.trim().toUpperCase() ?? ''
  const collectedCountry = address?.country ?? ''
  const addressFlagged =
    totalCents !== session.totalCents ||
    (collectedCountry !== '' && collectedCountry !== 'US') ||
    // Only meaningful when the shop asked where it was going. With no tax
    // configured it never asked, and any state Square collects is fine.
    (session.shipToState !== '' &&
      collectedState !== '' &&
      collectedState !== session.shipToState)

  if (addressFlagged) {
    console.warn(
      `[webhook] Order from session ${session.id} flagged: quoted ${session.totalCents} to ${session.shipToState}, charged ${totalCents} to ${collectedState || '?'} ${collectedCountry || '?'}.`,
    )
  }

  const cart = parseCart(session.cart)
  const items = cart.map((line) => ({
    productId: line.id,
    name: line.name,
    slug: line.slug,
    unitPriceCents: line.unit,
    quantity: line.q,
    lineTotalCents: line.unit * line.q,
  }))

  const settings = await getSettings()

  // Order creation and stock movement succeed or fail together.
  const orderNumber = await db.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, settings.orderNumberPrefix)

    await tx.order.create({
      data: {
        orderNumber: number,
        squareOrderId,
        squarePaymentId: payment.id ?? null,
        email,
        name: name || null,
        status: 'PAID',
        subtotalCents,
        shippingCents,
        taxCents,
        discountCents,
        totalCents,
        currency: (squareOrder.totalMoney?.currency ?? session.currency).toLowerCase(),
        shipToState: session.shipToState || null,
        addressFlagged,
        shippingAddress: address ? JSON.stringify(address) : null,
        items: { create: items },
      },
    })

    for (const item of items) {
      // `decrement` is applied by the database, so concurrent orders cannot
      // both read the same starting value and overwrite each other.
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    // Clamp any product that oversold into negative stock.
    await tx.product.updateMany({
      where: { id: { in: items.map((i) => i.productId) }, stock: { lt: 0 } },
      data: { stock: 0 },
    })

    // A promo code is counted only once payment has actually succeeded, and
    // inside the same transaction as the order — so a redemption can never be
    // recorded for an order that failed to save, or vice versa.
    if (session.promoCodeId && discountCents > 0) {
      const promo = await tx.promoCode.findUnique({ where: { id: session.promoCodeId } })
      if (promo) {
        await tx.promoCode.update({
          where: { id: session.promoCodeId },
          data: { timesRedeemed: { increment: 1 } },
        })
        await tx.promoRedemption.create({
          data: {
            promoCodeId: session.promoCodeId,
            orderNumber: number,
            discountCents,
            email,
          },
        })
      }
    }

    await tx.checkoutSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED' },
    })

    return number
  })

  await sendOrderEmails({
    orderNumber,
    customerName: name || null,
    email,
    items,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    currency: session.currency,
    shippingAddress: address ? JSON.stringify(address) : null,
  })

  await notifyLowStock(items.map((i) => i.productId), settings.lowStockThreshold)
}

/**
 * Refunds.
 *
 * The cumulative figure comes from the payment itself rather than from adding
 * up refund events, which is what makes this safe to replay: `refund.created`
 * and `refund.updated` for the same refund both arrive, and adding each one
 * would double-count.
 *
 * A refund that covers the whole order returns the stock to the shelf. A
 * partial one does not — a partial refund is usually goodwill or a discount
 * after the fact, with nothing coming back to the studio, and wrongly adding
 * stock is worse than leaving it to the owner to adjust.
 */
async function handleRefund(refundId: string) {
  const found = await fetchOrNull(() => getSquare().refunds.get({ refundId }))
  if (!found) {
    console.info(`[webhook] Refund ${refundId} does not exist; nothing to do.`)
    return
  }

  const { refund } = found
  if (!refund || refund.status !== 'COMPLETED') return

  const paymentId = refund.paymentId
  if (!paymentId) return

  const order = await db.order.findFirst({
    where: { squarePaymentId: paymentId },
    include: { items: true },
  })
  if (!order) return

  const paid = await fetchOrNull(() => getSquare().payments.get({ paymentId }))
  const refundedCents = centsOf(paid?.payment?.refundedMoney)
  if (refundedCents <= 0) return

  const isFull = refundedCents >= order.totalCents
  const alreadyRestocked = order.status === 'REFUNDED'

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedCents,
        status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    })

    if (isFull && !alreadyRestocked) {
      for (const item of order.items) {
        if (!item.productId) continue
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
  })
}

// ---------------------------------------------------------------------------

type CartLine = { id: string; q: number; unit: number; name: string; slug: string }

function parseCart(raw: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).id === 'string' &&
        typeof (line as CartLine).q === 'number' &&
        typeof (line as CartLine).unit === 'number',
    )
  } catch {
    return []
  }
}

async function sendOrderEmails(data: OrderEmailData) {
  if (data.email && !data.email.endsWith('@unknown.invalid')) {
    const confirmation = await orderConfirmationEmail(data)
    const result = await sendEmail({
      to: data.email,
      subject: confirmation.subject,
      html: confirmation.html,
    })
    if (result.ok) {
      await db.order
        .update({
          where: { orderNumber: data.orderNumber },
          data: { confirmationEmailSentAt: new Date() },
        })
        .catch(() => {})
    }
  }

  const ownerAddress = process.env.OWNER_NOTIFICATION_EMAIL
  if (ownerAddress) {
    const owner = ownerNewOrderEmail(data)
    await sendEmail({ to: ownerAddress, subject: owner.subject, html: owner.html })
  }
}

async function notifyLowStock(productIds: string[], threshold: number) {
  const ownerAddress = process.env.OWNER_NOTIFICATION_EMAIL
  if (!ownerAddress) return

  const low = await db.product.findMany({
    where: { id: { in: productIds }, stock: { lte: threshold } },
    select: { name: true, stock: true },
    orderBy: { stock: 'asc' },
  })
  if (low.length === 0) return

  const email = lowStockEmail(low)
  await sendEmail({ to: ownerAddress, subject: email.subject, html: email.html })
}
