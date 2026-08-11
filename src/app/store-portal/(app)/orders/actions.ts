'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser, recordAudit } from '@/lib/auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
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

  const email = shippingNoticeEmail({
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
 * Refunds through Stripe. Stock is returned to the shelf by the
 * `charge.refunded` webhook rather than here, so a refund issued from the
 * Stripe dashboard behaves identically to one issued from this portal.
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
  if (!order.stripePaymentIntentId) {
    return { error: 'No Stripe payment is attached to this order.' }
  }
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured, so no refund can be issued.' }
  }

  try {
    await getStripe().refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reason: 'requested_by_customer',
    })
  } catch (error) {
    console.error('[orders] Refund failed:', error)
    return { error: 'Stripe rejected the refund. Check the Stripe dashboard.' }
  }

  await recordAudit({
    user,
    action: 'order.refund',
    entity: 'order',
    entityId: orderId,
    meta: { amount: order.totalCents },
  })

  revalidatePath('/store-portal/orders')
  revalidatePath(`/store-portal/orders/${orderId}`)

  return { message: 'Refund issued. Stock returns automatically once Stripe confirms.' }
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
