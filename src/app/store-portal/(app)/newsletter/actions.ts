'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { recordAudit, requireUser } from '@/lib/auth'
import { emailSchema } from '@/lib/validation'
import { subscribe, unsubscribeById } from '@/lib/newsletter'

export type SubscriberActionState = { error?: string; message?: string }

export async function addSubscriber(
  _previous: SubscriberActionState,
  formData: FormData,
): Promise<SubscriberActionState> {
  const user = await requireUser()

  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' }
  }

  const name = String(formData.get('name') ?? '').trim().slice(0, 120)
  const result = await subscribe(parsed.data, 'manual', name || undefined)
  if (!result.ok) return { error: result.reason }

  await recordAudit({
    user,
    action: 'newsletter.add',
    entity: 'subscriber',
    meta: { email: parsed.data, status: result.status },
  })

  revalidatePath('/store-portal/newsletter')

  return {
    message:
      result.status === 'already'
        ? `${parsed.data} was already on the list.`
        : `${parsed.data} added.`,
  }
}

export async function removeSubscriber(id: string): Promise<void> {
  const user = await requireUser()

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: { email: true },
  })
  if (!subscriber) return

  await unsubscribeById(id, 'portal')
  await recordAudit({
    user,
    action: 'newsletter.unsubscribe',
    entity: 'subscriber',
    entityId: id,
    meta: { email: subscriber.email },
  })

  revalidatePath('/store-portal/newsletter')
}

export async function restoreSubscriber(id: string): Promise<void> {
  const user = await requireUser()

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: { email: true },
  })
  if (!subscriber) return

  await subscribe(subscriber.email, 'manual')
  await recordAudit({
    user,
    action: 'newsletter.restore',
    entity: 'subscriber',
    entityId: id,
    meta: { email: subscriber.email },
  })

  revalidatePath('/store-portal/newsletter')
}

/**
 * Deletes someone outright, for a erasure request.
 *
 * The subscriber row goes, but a DELETED event is left behind with the address
 * so the growth history still balances. If that is not wanted either, the row
 * and its events can be removed together from the database directly.
 */
export async function deleteSubscriber(id: string): Promise<void> {
  const user = await requireUser()

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: { email: true, status: true },
  })
  if (!subscriber) return

  await db.$transaction(async (tx) => {
    if (subscriber.status !== 'UNSUBSCRIBED') {
      await tx.newsletterEvent.create({
        data: { email: subscriber.email, type: 'DELETED', source: 'portal' },
      })
    }
    await tx.newsletterSubscriber.delete({ where: { id } })
  })

  await recordAudit({
    user,
    action: 'newsletter.delete',
    entity: 'subscriber',
    entityId: id,
    meta: { email: subscriber.email },
  })

  revalidatePath('/store-portal/newsletter')
}
