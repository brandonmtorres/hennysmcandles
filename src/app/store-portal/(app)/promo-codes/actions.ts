'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recordAudit, requireUser } from '@/lib/auth'
import { fieldErrors } from '@/lib/validation'
import { normaliseCode } from '@/lib/promo'
import { parsePriceToCents } from '@/lib/money'

export type PromoFormState = {
  errors?: Record<string, string>
  message?: string
}

const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Use at least 3 characters.')
      .max(40)
      .regex(/^[A-Z0-9-]+$/, 'Letters, numbers and hyphens only.'),
    kind: z.enum(['PERCENT', 'FIXED']),
    value: z.number().int().min(1, 'Set a value above zero.'),
    minSubtotalCents: z.number().int().min(0).max(1_000_000),
    maxRedemptions: z.number().int().min(0).max(1_000_000),
    active: z.boolean(),
    note: z.string().trim().max(200).default(''),
  })
  .refine((data) => data.kind !== 'PERCENT' || data.value <= 90, {
    message: 'A percentage cannot exceed 90.',
    path: ['value'],
  })

function readDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function savePromoCode(
  promoId: string | null,
  _previous: PromoFormState,
  formData: FormData,
): Promise<PromoFormState> {
  const user = await requireUser()
  const text = (key: string) => String(formData.get(key) ?? '').trim()

  const kind = text('kind') === 'FIXED' ? 'FIXED' : 'PERCENT'
  // A percentage is a whole number; a fixed amount is money, so it is read in
  // the same way prices are and stored in cents.
  const value =
    kind === 'FIXED'
      ? (parsePriceToCents(text('value')) ?? 0)
      : (Number.parseInt(text('value'), 10) || 0)

  const parsed = promoSchema.safeParse({
    code: normaliseCode(text('code')),
    kind,
    value,
    minSubtotalCents: parsePriceToCents(text('minSubtotal')) ?? 0,
    maxRedemptions: Number.parseInt(text('maxRedemptions'), 10) || 0,
    active: formData.get('active') === 'on',
    note: text('note'),
  })

  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  const startsAt = readDate(formData.get('startsAt'))
  const endsAt = readDate(formData.get('endsAt'))
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { errors: { endsAt: 'The end must come after the start.' } }
  }

  const clash = await db.promoCode.findFirst({
    where: { code: parsed.data.code, ...(promoId ? { NOT: { id: promoId } } : {}) },
    select: { id: true },
  })
  if (clash) return { errors: { code: 'That code already exists.' } }

  const data = { ...parsed.data, startsAt, endsAt }

  if (promoId) {
    await db.promoCode.update({ where: { id: promoId }, data })
    await recordAudit({
      user,
      action: 'promo.update',
      entity: 'promoCode',
      entityId: promoId,
      meta: { code: data.code, kind: data.kind, value: data.value },
    })
  } else {
    const created = await db.promoCode.create({ data })
    await recordAudit({
      user,
      action: 'promo.create',
      entity: 'promoCode',
      entityId: created.id,
      meta: { code: data.code },
    })
  }

  revalidatePath('/store-portal/promo-codes')
  redirect('/store-portal/promo-codes?saved=1')
}

export async function togglePromoCode(promoId: string, active: boolean): Promise<void> {
  const user = await requireUser()
  await db.promoCode.update({ where: { id: promoId }, data: { active } })
  await recordAudit({
    user,
    action: active ? 'promo.enable' : 'promo.disable',
    entity: 'promoCode',
    entityId: promoId,
  })
  revalidatePath('/store-portal/promo-codes')
}

export async function deletePromoCode(promoId: string): Promise<void> {
  const user = await requireUser()

  const promo = await db.promoCode.findUnique({
    where: { id: promoId },
    select: { code: true, timesRedeemed: true },
  })
  if (!promo) return

  if (promo.timesRedeemed > 0) {
    // The code appears on real orders. Deleting it would take its redemption
    // history with it, so it is switched off instead.
    await db.promoCode.update({ where: { id: promoId }, data: { active: false } })
    await recordAudit({
      user,
      action: 'promo.disable',
      entity: 'promoCode',
      entityId: promoId,
      meta: { reason: 'has redemptions', code: promo.code },
    })
  } else {
    await db.promoCode.delete({ where: { id: promoId } })
    await recordAudit({
      user,
      action: 'promo.delete',
      entity: 'promoCode',
      entityId: promoId,
      meta: { code: promo.code },
    })
  }

  revalidatePath('/store-portal/promo-codes')
  redirect('/store-portal/promo-codes')
}
