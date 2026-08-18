/**
 * Money handling.
 *
 * Every amount in this codebase is an integer number of cents. Floats are
 * never used for money, and the effective (post-sale) price is *derived*
 * here rather than stored, so a sale can never drift out of sync with the
 * list price.
 */

export type Priceable = {
  priceCents: number
  onSale: boolean
  salePercent: number
}

/** Sale percentages are clamped defensively — the DB is not the only guard. */
export function clampSalePercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(90, Math.max(0, Math.round(percent)))
}

/** A collection's promotion, as it applies to one product. */
export type CollectionPromo = {
  salePercent: number
  saleActive: boolean
  visibility: string
  startsAt: Date | null
  endsAt: Date | null
}

/** Whether a collection's promotion is live right now. */
export function isPromoLive(promo: CollectionPromo, now = new Date()): boolean {
  if (!promo.saleActive || clampSalePercent(promo.salePercent) <= 0) return false
  if (promo.visibility === 'HIDDEN') return false
  if (promo.startsAt && now < promo.startsAt) return false
  if (promo.endsAt && now > promo.endsAt) return false
  return true
}

/**
 * The discount actually applied to a product, as a percentage.
 *
 * A candle can be on sale in its own right and also sit inside a collection
 * running a promotion. Rather than stacking them — which compounds into
 * accidental near-zero prices — the larger single discount wins. One rule,
 * easy to reason about, and it can never charge less than the deepest
 * discount the owner deliberately set.
 */
export function resolveDiscountPercent(
  product: Priceable,
  promos: CollectionPromo[] = [],
  now = new Date(),
): number {
  const own = product.onSale ? clampSalePercent(product.salePercent) : 0
  const best = promos.reduce(
    (max, promo) =>
      isPromoLive(promo, now) ? Math.max(max, clampSalePercent(promo.salePercent)) : max,
    0,
  )
  return Math.max(own, best)
}

/**
 * The price a customer actually pays, in cents.
 * This is the single source of truth used by the cart, the product page and
 * — critically — by the Square order builder at checkout.
 */
export function effectivePriceCents(
  p: Priceable,
  promos: CollectionPromo[] = [],
  now = new Date(),
): number {
  const pct = resolveDiscountPercent(p, promos, now)
  if (pct <= 0) return p.priceCents
  return Math.max(0, Math.round(p.priceCents * (1 - pct / 100)))
}

export function isDiscounted(
  p: Priceable,
  promos: CollectionPromo[] = [],
  now = new Date(),
): boolean {
  return resolveDiscountPercent(p, promos, now) > 0
}

export function formatMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Parses a user-typed price ("34", "$34.00", "34.5") into cents. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
