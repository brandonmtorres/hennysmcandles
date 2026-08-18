/**
 * Carries data from the old SQLite database into Postgres.
 *
 * Re-seeding is not a migration. The seed recreates the catalogue, but
 * everything entered through the portal afterwards — collections, seasonal
 * banner settings, promo codes, the mailing list, orders — exists only in the
 * old file, and a swap that quietly drops it looks exactly like a swap that
 * worked.
 *
 * Products are matched by **slug**, not by id: the seed generates fresh ids on
 * every run, so a collection copied across with its original product ids would
 * point at nothing. Everything is upserted, so running this twice is safe.
 *
 *   node scripts/migrate-sqlite-to-postgres.mjs [path/to/dev.db]
 */
import { DatabaseSync } from 'node:sqlite'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const SOURCE = process.argv[2] ?? 'prisma/dev.db'

if (!fs.existsSync(SOURCE)) {
  console.error(`\nNo SQLite database at ${SOURCE}. Nothing to migrate.\n`)
  process.exit(1)
}

const sqlite = new DatabaseSync(SOURCE, { readOnly: true })
const db = new PrismaClient()

const moved = []
const skipped = []

/** Reads a table, tolerating one that never existed in the old schema. */
function read(table) {
  try {
    return sqlite.prepare(`SELECT * FROM "${table}"`).all()
  } catch {
    return []
  }
}

/** SQLite keeps dates as epoch milliseconds; Prisma wants Date objects. */
function date(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return new Date(value)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function bool(value) {
  return value === 1 || value === true
}

console.log(`\nMigrating from ${SOURCE}\n`)

// --- Settings ---------------------------------------------------------------
// Everything the owner changed in the portal: shipping rates, popup wording,
// the shop's own address.

for (const row of read('Setting')) {
  await db.setting.upsert({
    where: { key: row.key },
    create: { key: row.key, value: row.value },
    update: { value: row.value },
  })
}
moved.push(`${read('Setting').length} settings`)

// --- Products ---------------------------------------------------------------
// Not copied — the seed owns the catalogue. But their ids are needed to
// rebuild every relationship below.

const products = await db.product.findMany({ select: { id: true, slug: true } })
const productIdBySlug = new Map(products.map((p) => [p.slug, p.id]))

const oldProductSlugById = new Map(read('Product').map((p) => [p.id, p.slug]))

/** Old product id → new product id, by way of the slug. */
function productId(oldId) {
  const slug = oldProductSlugById.get(oldId)
  return slug ? (productIdBySlug.get(slug) ?? null) : null
}

// --- Collections ------------------------------------------------------------

const collections = read('Collection')
for (const row of collections) {
  const data = {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    visibility: row.visibility ?? 'VISIBLE',
    startsAt: date(row.startsAt),
    endsAt: date(row.endsAt),
    salePercent: row.salePercent ?? 0,
    saleActive: bool(row.saleActive),
    featured: bool(row.featured),
    sortOrder: row.sortOrder ?? 0,
    theme: row.theme ?? 'NONE',
    bannerActive: bool(row.bannerActive),
    bannerHeading: row.bannerHeading ?? '',
    bannerBody: row.bannerBody ?? '',
    imageUrl: row.imageUrl ?? null,
  }
  await db.collection.upsert({
    where: { slug: row.slug },
    create: data,
    update: data,
  })
}
moved.push(`${collections.length} collections`)

// Rebuild the links, translating both sides to their new ids.
const newCollections = await db.collection.findMany({ select: { id: true, slug: true } })
const collectionIdBySlug = new Map(newCollections.map((c) => [c.slug, c.id]))
const oldCollectionSlugById = new Map(collections.map((c) => [c.id, c.slug]))

let links = 0
for (const row of read('ProductCollection')) {
  const newProductId = productId(row.productId)
  const slug = oldCollectionSlugById.get(row.collectionId)
  const newCollectionId = slug ? collectionIdBySlug.get(slug) : null

  if (!newProductId || !newCollectionId) {
    skipped.push(`a collection link whose product or collection no longer exists`)
    continue
  }

  await db.productCollection.upsert({
    where: {
      productId_collectionId: {
        productId: newProductId,
        collectionId: newCollectionId,
      },
    },
    create: {
      productId: newProductId,
      collectionId: newCollectionId,
      sortOrder: row.sortOrder ?? 0,
    },
    update: { sortOrder: row.sortOrder ?? 0 },
  })
  links += 1
}
moved.push(`${links} product–collection links`)

// --- Promo codes ------------------------------------------------------------

const promos = read('PromoCode')
for (const row of promos) {
  const data = {
    code: row.code,
    kind: row.kind ?? 'PERCENT',
    value: row.value ?? 0,
    minSubtotalCents: row.minSubtotalCents ?? 0,
    maxRedemptions: row.maxRedemptions ?? 0,
    timesRedeemed: row.timesRedeemed ?? 0,
    active: bool(row.active),
    startsAt: date(row.startsAt),
    endsAt: date(row.endsAt),
    note: row.note ?? '',
  }
  await db.promoCode.upsert({ where: { code: row.code }, create: data, update: data })
}
moved.push(`${promos.length} promo codes`)

// --- Mailing list -----------------------------------------------------------

const subscribers = read('NewsletterSubscriber')
for (const row of subscribers) {
  const data = {
    email: row.email,
    name: row.name ?? null,
    status: row.status ?? 'SUBSCRIBED',
    source: row.source ?? 'import',
    unsubscribeToken: row.unsubscribeToken,
    subscribedAt: date(row.subscribedAt) ?? new Date(),
    unsubscribedAt: date(row.unsubscribedAt),
    welcomedAt: date(row.welcomedAt),
    tag: row.tag ?? '',
  }
  await db.newsletterSubscriber.upsert({
    where: { email: row.email },
    create: data,
    update: data,
  })
}
moved.push(`${subscribers.length} newsletter subscribers`)

// --- Orders -----------------------------------------------------------------
// Kept last because they carry the most history, and because an order is only
// meaningful with its lines.

const orders = read('Order')
let orderCount = 0
for (const row of orders) {
  const existing = await db.order.findUnique({ where: { orderNumber: row.orderNumber } })
  if (existing) continue

  const items = read('OrderItem').filter((i) => i.orderId === row.id)

  await db.order.create({
    data: {
      orderNumber: row.orderNumber,
      // These columns were renamed with the move to Square; an old row may
      // carry either name.
      squareOrderId: row.squareOrderId ?? row.stripeSessionId ?? `legacy-${row.orderNumber}`,
      squarePaymentId: row.squarePaymentId ?? row.stripePaymentIntentId ?? null,
      email: row.email,
      name: row.name ?? null,
      phone: row.phone ?? null,
      status: row.status ?? 'PAID',
      subtotalCents: row.subtotalCents ?? 0,
      shippingCents: row.shippingCents ?? 0,
      taxCents: row.taxCents ?? 0,
      discountCents: row.discountCents ?? 0,
      totalCents: row.totalCents ?? 0,
      refundedCents: row.refundedCents ?? 0,
      currency: row.currency ?? 'usd',
      shipToState: row.shipToState ?? null,
      addressFlagged: bool(row.addressFlagged),
      shippingAddress: row.shippingAddress ?? null,
      trackingNumber: row.trackingNumber ?? null,
      carrier: row.carrier ?? null,
      internalNotes: row.internalNotes ?? null,
      confirmationEmailSentAt: date(row.confirmationEmailSentAt),
      shippedEmailSentAt: date(row.shippedEmailSentAt),
      createdAt: date(row.createdAt) ?? new Date(),
      items: {
        create: items.map((item) => ({
          productId: productId(item.productId),
          name: item.name,
          slug: item.slug,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          lineTotalCents: item.lineTotalCents,
        })),
      },
    },
  })
  orderCount += 1
}
moved.push(`${orderCount} orders`)

// The order-number counter has to clear the highest number already used, or
// the next live order collides with a migrated one.
const highest = await db.order.findMany({ select: { orderNumber: true } })
const highestNumber = highest
  .map((o) => Number.parseInt(o.orderNumber.split('-').pop() ?? '0', 10))
  .filter((n) => Number.isFinite(n))
  .reduce((max, n) => Math.max(max, n), 0)

if (highestNumber > 0) {
  await db.counter.upsert({
    where: { name: 'order' },
    create: { name: 'order', value: highestNumber },
    update: { value: highestNumber },
  })
  moved.push(`order counter set past ${highestNumber}`)
}

// ---------------------------------------------------------------------------

console.log('  Moved across:')
for (const line of moved) console.log(`    · ${line}`)

if (skipped.length > 0) {
  console.log('\n  Skipped:')
  for (const line of [...new Set(skipped)]) console.log(`    · ${line}`)
}

console.log('\n  The portal owner account is not copied — the seed creates it from')
console.log('  PORTAL_OWNER_EMAIL and PORTAL_OWNER_PASSWORD, and a password hash')
console.log('  should not be carried between environments.\n')

sqlite.close()
await db.$disconnect()
