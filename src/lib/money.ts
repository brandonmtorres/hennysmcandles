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

/**
 * The price a customer actually pays, in cents.
 * This is the single source of truth used by the cart, the product page and
 * — critically — by the Stripe Checkout session builder.
 */
export function effectivePriceCents(p: Priceable): number {
  if (!p.onSale || p.salePercent <= 0) return p.priceCents
  const pct = clampSalePercent(p.salePercent)
  return Math.max(0, Math.round(p.priceCents * (1 - pct / 100)))
}

export function isDiscounted(p: Priceable): boolean {
  return p.onSale && clampSalePercent(p.salePercent) > 0
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
