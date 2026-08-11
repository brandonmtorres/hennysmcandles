import { db } from '@/lib/db'

/** Store configuration, editable from the portal. */
export type StoreSettings = {
  storeName: string
  storeEmail: string
  currency: string
  shippingFlatCents: number
  freeShippingThresholdCents: number
  taxPercent: number
  lowStockThreshold: number
  newsletterDiscountPercent: number
  orderNumberPrefix: string
  announcement: string
}

const DEFAULTS: StoreSettings = {
  storeName: 'Hennys M. Homemade Candles',
  storeEmail: 'hello@hennysmcandles.com',
  currency: 'usd',
  shippingFlatCents: 695,
  freeShippingThresholdCents: 7500,
  taxPercent: 0,
  lowStockThreshold: 3,
  newsletterDiscountPercent: 10,
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
  lowStockThreshold: 'low_stock_threshold',
  newsletterDiscountPercent: 'newsletter_discount_percent',
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
    lowStockThreshold: num('lowStockThreshold', DEFAULTS.lowStockThreshold),
    newsletterDiscountPercent: num(
      'newsletterDiscountPercent',
      DEFAULTS.newsletterDiscountPercent,
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
