import { db } from '@/lib/db'

/**
 * Promo code validation and discount maths.
 *
 * The same function decides both what the cart previews and what Square is
 * told to charge, so the two can never disagree. Codes are stored upper-case
 * and looked up upper-case, which makes entry case-insensitive without
 * allowing two codes that differ only in case.
 */

export type PromoKind = 'PERCENT' | 'FIXED'

export type PromoCheck =
  | { ok: true; id: string; code: string; discountCents: number; describe: string }
  | { ok: false; reason: string }

export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}

/** How much a code takes off a given subtotal, in cents. */
export function discountFor(
  promo: { kind: string; value: number },
  subtotalCents: number,
): number {
  if (promo.kind === 'FIXED') {
    return Math.max(0, Math.min(promo.value, subtotalCents))
  }
  const percent = Math.max(0, Math.min(90, promo.value))
  return Math.max(0, Math.min(subtotalCents, Math.round((subtotalCents * percent) / 100)))
}

export function describePromo(promo: { kind: string; value: number }): string {
  return promo.kind === 'FIXED'
    ? `$${(promo.value / 100).toFixed(2)} off`
    : `${promo.value}% off`
}

/**
 * Looks a code up and decides whether it may be used right now.
 *
 * Every refusal returns the same shape with a plain-language reason, and the
 * reasons are deliberately specific — telling someone their code expired is
 * more useful than a blanket "invalid", and none of it is sensitive.
 */
export async function checkPromoCode(
  rawCode: string,
  subtotalCents: number,
  now = new Date(),
): Promise<PromoCheck> {
  const code = normaliseCode(rawCode)
  if (!code) return { ok: false, reason: 'Enter a code.' }
  if (code.length > 40) return { ok: false, reason: 'That is not a valid code.' }

  const promo = await db.promoCode.findUnique({ where: { code } })
  if (!promo) return { ok: false, reason: 'That code is not recognised.' }
  if (!promo.active) return { ok: false, reason: 'That code is no longer active.' }

  if (promo.startsAt && now < promo.startsAt) {
    return { ok: false, reason: 'That code has not started yet.' }
  }
  if (promo.endsAt && now > promo.endsAt) {
    return { ok: false, reason: 'That code has expired.' }
  }
  if (promo.maxRedemptions > 0 && promo.timesRedeemed >= promo.maxRedemptions) {
    return { ok: false, reason: 'That code has been fully redeemed.' }
  }
  if (subtotalCents < promo.minSubtotalCents) {
    const short = ((promo.minSubtotalCents - subtotalCents) / 100).toFixed(2)
    return {
      ok: false,
      reason: `Spend $${short} more to use this code.`,
    }
  }

  const discountCents = discountFor(promo, subtotalCents)
  if (discountCents <= 0) {
    return { ok: false, reason: 'That code takes nothing off this order.' }
  }

  return {
    ok: true,
    id: promo.id,
    code: promo.code,
    discountCents,
    describe: describePromo(promo),
  }
}
