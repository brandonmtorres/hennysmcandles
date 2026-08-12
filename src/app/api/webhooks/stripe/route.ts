import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { getSettings } from '@/lib/settings'
import { effectivePriceCents } from '@/lib/money'
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
 * Stripe webhook receiver — the single source of truth for order creation.
 *
 * Why everything happens here rather than on the success page:
 *  · The success page can be closed, refreshed, or never loaded at all. A
 *    webhook is delivered regardless, and retried until acknowledged.
 *  · The payload is cryptographically signed, so it cannot be forged. A
 *    customer hitting the success URL directly proves nothing.
 *  · Stock is decremented inside a database transaction alongside order
 *    creation, so an order can never exist without its stock movement.
 *
 * Idempotency: Stripe retries on any non-2xx, and may deliver the same event
 * more than once. Each event id is recorded, and the order carries a unique
 * constraint on the Stripe session id, so a replay cannot double-decrement.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting.')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  // The raw body is required — parsing it first would break signature checking.
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('[webhook] Signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  // Already handled? Acknowledge and stop.
  const seen = await db.processedWebhook.findUnique({ where: { id: event.id } })
  if (seen) return NextResponse.json({ received: true, duplicate: true })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'charge.refunded':
        await handleRefund(event.data.object)
        break
      default:
        break
    }

    await db.processedWebhook.create({ data: { id: event.id, type: event.type } })
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[webhook] Handler failed for ${event.type}:`, error)
    // A non-2xx tells Stripe to retry, which is what we want on a transient fault.
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return

  // An order for this session already exists — nothing further to do.
  const existing = await db.order.findUnique({ where: { stripeSessionId: session.id } })
  if (existing) return

  const cartJson = session.metadata?.cart
  if (!cartJson) {
    console.error('[webhook] Session has no cart metadata:', session.id)
    return
  }

  let cart: { id: string; q: number }[]
  try {
    cart = JSON.parse(cartJson)
  } catch {
    console.error('[webhook] Cart metadata is not valid JSON:', session.id)
    return
  }

  const products = await db.product.findMany({
    where: { id: { in: cart.map((c) => c.id) } },
    include: { collections: { include: { collection: true } } },
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  const settings = await getSettings()
  const currency = session.currency ?? settings.currency

  const subtotalCents = session.amount_subtotal ?? 0
  const totalCents = session.amount_total ?? 0
  const shippingCents = session.total_details?.amount_shipping ?? 0
  const taxCents = session.total_details?.amount_tax ?? 0
  const discountCents = session.total_details?.amount_discount ?? 0

  const orderNumber = await nextOrderNumber(settings.orderNumberPrefix)

  const address =
    // `collected_information` is the current location; `customer_details` is
    // kept as a fallback for older API versions.
    (session as unknown as { collected_information?: { shipping_details?: unknown } })
      .collected_information?.shipping_details ??
    session.customer_details?.address ??
    null

  const items = cart
    .map((line) => {
      const product = byId.get(line.id)
      if (!product) return null
      // The shared helper, not a local copy: this had drifted out of step with
      // the checkout builder once collections gained their own promotions, so
      // the stored order would have disagreed with what Stripe charged.
      const unit = effectivePriceCents(
        product,
        product.collections.map((link) => link.collection),
      )
      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        unitPriceCents: unit,
        quantity: line.q,
        lineTotalCents: unit * line.q,
      }
    })
    .filter((i): i is NonNullable<typeof i> => i !== null)

  // Order creation and stock movement succeed or fail together.
  await db.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNumber,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        email: session.customer_details?.email ?? 'unknown@unknown.invalid',
        name: session.customer_details?.name ?? null,
        status: 'PAID',
        subtotalCents,
        shippingCents,
        taxCents,
        discountCents,
        totalCents,
        currency,
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
    const promoCodeId = session.metadata?.promoCodeId
    if (promoCodeId && discountCents > 0) {
      const promo = await tx.promoCode.findUnique({ where: { id: promoCodeId } })
      if (promo) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { timesRedeemed: { increment: 1 } },
        })
        await tx.promoRedemption.create({
          data: {
            promoCodeId,
            orderNumber,
            discountCents,
            email: session.customer_details?.email ?? null,
          },
        })
      }
    }
  })

  await sendOrderEmails({
    orderNumber,
    customerName: session.customer_details?.name ?? null,
    email: session.customer_details?.email ?? '',
    items,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    currency,
    shippingAddress: address ? JSON.stringify(address) : null,
  })

  await notifyLowStock(items.map((i) => i.productId), settings.lowStockThreshold)
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : null
  if (!paymentIntentId) return

  const order = await db.order.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { items: true },
  })
  if (!order || order.status === 'REFUNDED') return

  // A refund returns the stock to the shelf.
  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    })
    for (const item of order.items) {
      if (!item.productId) continue
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }
  })
}

// ---------------------------------------------------------------------------

/** Sequential, human-readable order numbers: HM-1001, HM-1002, … */
async function nextOrderNumber(prefix: string): Promise<string> {
  const count = await db.order.count()
  return `${prefix}-${1001 + count}`
}

async function sendOrderEmails(data: OrderEmailData) {
  if (data.email) {
    const confirmation = orderConfirmationEmail(data)
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
