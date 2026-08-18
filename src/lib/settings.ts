import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'

/** Store configuration, editable from the portal. */
export type StoreSettings = {
  storeName: string
  storeEmail: string
  currency: string
  shippingFlatCents: number
  freeShippingThresholdCents: number
  taxPercent: number
  /// Two-letter state whose customers are charged `taxPercent`. Blank charges
  /// no tax to anyone, which is the setting a shop starts on.
  taxHomeState: string
  lowStockThreshold: number
  newsletterDiscountPercent: number
  /// Promo code handed out in the welcome email. Blank sends no code.
  newsletterWelcomeCode: string
  /// The signup invitation on the shop. All of it is editable from the portal
  /// so the wording can follow a season without a code change.
  newsletterPopupEnabled: boolean
  newsletterPopupEyebrow: string
  newsletterPopupHeadingLead: string
  newsletterPopupHeadingTail: string
  newsletterPopupBody: string
  newsletterPopupButton: string
  /// Seconds of reading before it appears, and how far down the page counts as
  /// interested. Either may be 0 to switch that trigger off.
  newsletterPopupDelaySeconds: number
  newsletterPopupScrollPercent: number
  orderNumberPrefix: string
  announcement: string
}

const DEFAULTS: StoreSettings = {
  storeName: 'Hennys M. Homemade Candles',
  storeEmail: 'support@hennysmcandles.com',
  currency: 'usd',
  shippingFlatCents: 695,
  freeShippingThresholdCents: 7500,
  taxPercent: 0,
  taxHomeState: '',
  lowStockThreshold: 3,
  newsletterDiscountPercent: 10,
  newsletterWelcomeCode: '',
  newsletterPopupEnabled: true,
  newsletterPopupEyebrow: 'The quiet list',
  newsletterPopupHeadingLead: 'Take',
  newsletterPopupHeadingTail: 'your first candle',
  newsletterPopupBody:
    'New pours, seasonal batches, and the occasional note from the studio. No noise, and one click to leave.',
  newsletterPopupButton: 'Send me the code',
  newsletterPopupDelaySeconds: 18,
  newsletterPopupScrollPercent: 35,
  orderNumberPrefix: 'HM',
  announcement: 'Hand-poured in small batches · Free shipping over $75',
}

const KEY_MAP: Record<keyof StoreSettings, string> = {
  storeName: 'store_name',
  storeEmail: 'store_email',
  currency: 'currency',
  shippingFlatCents: 'shipping_flat_cents',
  freeShippingThresholdCents: 'free_shipping_threshold_cents',
  taxPercent: 'tax_percent',
  taxHomeState: 'tax_home_state',
  lowStockThreshold: 'low_stock_threshold',
  newsletterDiscountPercent: 'newsletter_discount_percent',
  newsletterWelcomeCode: 'newsletter_welcome_code',
  newsletterPopupEnabled: 'newsletter_popup_enabled',
  newsletterPopupEyebrow: 'newsletter_popup_eyebrow',
  newsletterPopupHeadingLead: 'newsletter_popup_heading_lead',
  newsletterPopupHeadingTail: 'newsletter_popup_heading_tail',
  newsletterPopupBody: 'newsletter_popup_body',
  newsletterPopupButton: 'newsletter_popup_button',
  newsletterPopupDelaySeconds: 'newsletter_popup_delay_seconds',
  newsletterPopupScrollPercent: 'newsletter_popup_scroll_percent',
  orderNumberPrefix: 'order_number_prefix',
  announcement: 'announcement',
}

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.setting.findMany()
  const byKey = new Map(rows.map((r) => [r.key, r.value]))

  const read = (field: keyof StoreSettings) => byKey.get(KEY_MAP[field])

  const num = (field: keyof StoreSettings, fallback: number) => {
    const raw = read(field)
    if (raw === undefined) return fallback
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return {
    storeName: read('storeName') ?? DEFAULTS.storeName,
    storeEmail: read('storeEmail') ?? DEFAULTS.storeEmail,
    currency: read('currency') ?? DEFAULTS.currency,
    shippingFlatCents: num('shippingFlatCents', DEFAULTS.shippingFlatCents),
    freeShippingThresholdCents: num(
      'freeShippingThresholdCents',
      DEFAULTS.freeShippingThresholdCents,
    ),
    taxPercent: num('taxPercent', DEFAULTS.taxPercent),
    taxHomeState: (read('taxHomeState') ?? DEFAULTS.taxHomeState).toUpperCase(),
    lowStockThreshold: num('lowStockThreshold', DEFAULTS.lowStockThreshold),
    newsletterDiscountPercent: num(
      'newsletterDiscountPercent',
      DEFAULTS.newsletterDiscountPercent,
    ),
    newsletterWelcomeCode: read('newsletterWelcomeCode') ?? DEFAULTS.newsletterWelcomeCode,
    newsletterPopupEnabled: read('newsletterPopupEnabled') !== 'false',
    newsletterPopupEyebrow:
      read('newsletterPopupEyebrow') ?? DEFAULTS.newsletterPopupEyebrow,
    newsletterPopupHeadingLead:
      read('newsletterPopupHeadingLead') ?? DEFAULTS.newsletterPopupHeadingLead,
    newsletterPopupHeadingTail:
      read('newsletterPopupHeadingTail') ?? DEFAULTS.newsletterPopupHeadingTail,
    newsletterPopupBody: read('newsletterPopupBody') ?? DEFAULTS.newsletterPopupBody,
    newsletterPopupButton: read('newsletterPopupButton') ?? DEFAULTS.newsletterPopupButton,
    newsletterPopupDelaySeconds: num(
      'newsletterPopupDelaySeconds',
      DEFAULTS.newsletterPopupDelaySeconds,
    ),
    newsletterPopupScrollPercent: num(
      'newsletterPopupScrollPercent',
      DEFAULTS.newsletterPopupScrollPercent,
    ),
    orderNumberPrefix: read('orderNumberPrefix') ?? DEFAULTS.orderNumberPrefix,
    announcement: read('announcement') ?? DEFAULTS.announcement,
  }
}

export async function updateSettings(patch: Partial<StoreSettings>): Promise<void> {
  const entries = Object.entries(patch) as [keyof StoreSettings, unknown][]
  await db.$transaction(
    entries
      .filter(([field]) => field in KEY_MAP)
      .map(([field, value]) => {
        const key = KEY_MAP[field]
        const val = String(value)
        return db.setting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        })
      }),
  )
}

/** Shipping is free above the threshold, flat rate otherwise. */
export function shippingCentsFor(subtotalCents: number, s: StoreSettings): number {
  if (subtotalCents <= 0) return 0
  if (s.freeShippingThresholdCents > 0 && subtotalCents >= s.freeShippingThresholdCents) {
    return 0
  }
  return s.shippingFlatCents
}

/**
 * The one-line shipping promise, written from the settings themselves.
 *
 * The shop used to state its rate in three places in prose. Two of them went
 * stale the moment the owner changed the threshold, and a policy page that
 * contradicts the checkout is worse than one that says nothing.
 */
export function shippingNote(s: StoreSettings): string {
  if (s.freeShippingThresholdCents > 0) {
    return `Free shipping on orders over ${formatMoney(s.freeShippingThresholdCents, s.currency)}`
  }
  if (s.shippingFlatCents === 0) return 'Free shipping'
  return `Flat ${formatMoney(s.shippingFlatCents, s.currency)} shipping`
}

/**
 * The tax rate that applies to a destination, as a percentage.
 *
 * Sales tax is charged only to the shop's own state. A small maker generally
 * owes tax where they have a physical presence and nowhere else, so charging
 * every customer — or none of them once the shop is established — are both
 * wrong. Leaving `taxHomeState` blank charges nobody, which is the correct
 * setting until the owner has confirmed their obligation.
 */
export function taxPercentFor(shipToState: string, s: StoreSettings): number {
  if (!chargesTax(s)) return 0
  return shipToState.trim().toUpperCase() === s.taxHomeState ? s.taxPercent : 0
}

/**
 * Whether the shop charges tax to anyone at all.
 *
 * This is what decides whether the cart has to ask where the order is going.
 * Shipping is one flat rate nationwide, so the destination changes nothing
 * else — and a question that changes nothing should not be asked.
 */
export function chargesTax(s: StoreSettings): boolean {
  return Boolean(s.taxHomeState) && s.taxPercent > 0
}

/**
 * Tax in cents on a taxable base.
 *
 * The base is the goods after any discount, and deliberately excludes
 * shipping: taxing delivery is a per-state question this shop is not equipped
 * to answer, and not charging it can only ever err in the customer's favour.
 */
export function taxCentsFor(
  taxableCents: number,
  shipToState: string,
  s: StoreSettings,
): number {
  const percent = taxPercentFor(shipToState, s)
  if (percent <= 0 || taxableCents <= 0) return 0
  return Math.round((taxableCents * percent) / 100)
}
