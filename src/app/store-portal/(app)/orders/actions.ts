'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser, recordAudit } from '@/lib/auth'
import { getSquare, isSquareConfigured, money } from '@/lib/square/client'
import { formatMoney, parsePriceToCents } from '@/lib/money'
import { sendEmail } from '@/lib/email/send'
import { shippingNoticeEmail } from '@/lib/email/templates'

export type OrderActionState = { error?: string; message?: string }

/** Marks an order shipped and emails the customer their tracking number. */
export async function markFulfilled(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const user = await requireUser()

  const orderId = String(formData.get('orderId') ?? '')
  const trackingNumber = String(formData.get('trackingNumber') ?? '').trim().slice(0, 120)
  const carrier = String(formData.get('carrier') ?? '').trim().slice(0, 60)

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) return { error: 'That order no longer exists.' }
  if (order.status === 'REFUNDED') {
    return { error: 'This order was refunded and cannot be marked as shipped.' }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: 'FULFILLED',
      trackingNumber: trackingNumber || null,
      carrier: carrier || null,
    },
  })

  const email = await shippingNoticeEmail({
    orderNumber: order.orderNumber,
    customerName: order.name,
    email: order.email,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      lineTotalCents: i.lineTotalCents,
    })),
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    currency: order.currency,
    shippingAddress: order.shippingAddress,
    trackingNumber: trackingNumber || null,
    carrier: carrier || null,
  })

  const result = await sendEmail({
    to: order.email,
    subject: email.subject,
    html: email.html,
  })

  if (result.ok) {
    await db.order.update({
      where: { id: orderId },
      data: { shippedEmailSentAt: new Date() },
    })
  }

  await recordAudit({
    user,
    action: 'order.fulfil',
    entity: 'order',
    entityId: orderId,
    meta: { trackingNumber, carrier },
  })

  revalidatePath('/store-portal/orders')
  revalidatePath(`/store-portal/orders/${orderId}`)

  return {
    message: result.ok
      ? 'Marked as shipped. The customer has been emailed.'
      : 'Marked as shipped, but the email could not be sent.',
  }
}

/**
 * Refunds through Square, in full or in part.
 *
 * The order record is not touched here. Square's `refund.updated` webhook is
 * what writes the refunded amount and the new status, so a refund issued from
 * the Square dashboard — or from the card reader at a market — behaves
 * identically to one issued from this portal.
 */
export async function refundOrder(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const user = await requireUser()

  const orderId = String(formData.get('orderId') ?? '')
  const order = await db.order.findUnique({ where: { id: orderId } })

  if (!order) return { error: 'That order no longer exists.' }
  if (order.status === 'REFUNDED') return { error: 'This order is already refunded.' }
  if (!order.squarePaymentId) {
    return { error: 'No Square payment is attached to this order.' }
  }
  if (!isSquareConfigured()) {
    return { error: 'Square is not configured, so no refund can be issued.' }
  }

  // Blank means the whole remaining balance, which is the common case and the
  // one the confirm button offers.
  const typedAmount = String(formData.get('amount') ?? '').trim()
  const remainingCents = order.totalCents - order.refundedCents
  let amountCents = remainingCents

  if (typedAmount) {
    const parsedAmount = parsePriceToCents(typedAmount)
    if (parsedAmount === null || parsedAmount <= 0) {
      return { error: 'Enter an amount like 12.50, or leave it blank to refund it all.' }
    }
    if (parsedAmount > remainingCents) {
      return {
        error: `That is more than the ${formatMoney(remainingCents, order.currency)} still refundable on this order.`,
      }
    }
    amountCents = parsedAmount
  }

  if (amountCents <= 0) return { error: 'There is nothing left to refund.' }

  try {
    await getSquare().refunds.refundPayment({
      // Square requires an idempotency key; this one is unique per refund
      // attempt but stable within it, so a double-submitted form cannot
      // refund twice.
      idempotencyKey: `${order.id}-${order.refundedCents}-${amountCents}`,
      paymentId: order.squarePaymentId,
      amountMoney: money(amountCents, order.currency),
      reason: 'Requested by customer',
    })
  } catch (error) {
    console.error('[orders] Refund failed:', error)
    return { error: 'Square rejected the refund. Check the Square dashboard.' }
  }

  await recordAudit({
    user,
    action: 'order.refund',
    entity: 'order',
    entityId: orderId,
    meta: { amount: amountCents, full: amountCents === remainingCents },
  })

  revalidatePath('/store-portal/orders')
  revalidatePath(`/store-portal/orders/${orderId}`)

  return {
    message:
      amountCents === remainingCents
        ? 'Refund issued. Stock returns automatically once Square confirms.'
        : `${formatMoney(amountCents, order.currency)} refunded. Stock is left as it is — adjust it by hand if the candle is coming back.`,
  }
}

export async function saveOrderNotes(
  _previous: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requireUser()

  const orderId = String(formData.get('orderId') ?? '')
  const notes = String(formData.get('internalNotes') ?? '').slice(0, 2000)

  await db.order.update({ where: { id: orderId }, data: { internalNotes: notes } })
  revalidatePath(`/store-portal/orders/${orderId}`)

  return { message: 'Note saved.' }
}
