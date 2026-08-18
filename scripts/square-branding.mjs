/**
 * Dresses Square's hosted checkout page to match the shop.
 *
 * The page itself lives on Square's domain, so none of this site's CSS reaches
 * it. Square exposes a short list of levers and no more: the header, the
 * button's colour and shape, up to two policy blocks, and toggles for tipping,
 * coupons and customer notes. This sets all of them from one place, so the
 * same command can be run again against the production account at launch.
 *
 * The logo is the one thing with no API. Upload it under Account & Settings →
 * Business → Locations in the Square Dashboard, then set HEADER to
 * FULL_WIDTH_LOGO below and run this again.
 *
 * Run with:  node scripts/square-branding.mjs
 */
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

const TOKEN = env.SQUARE_ACCESS_TOKEN
const LOCATION = env.SQUARE_LOCATION_ID
const SANDBOX = (env.SQUARE_ENVIRONMENT ?? 'sandbox').toLowerCase() !== 'production'
const BASE = SANDBOX
  ? 'https://connect.squareupsandbox.com'
  : 'https://connect.squareup.com'

/** The lid foil, which is this shop's one accent. */
const GILD = '#c8a15a'

/** Squared, because every button on the storefront has square corners. */
const BUTTON_SHAPE = 'SQUARED'

/** Switch to FULL_WIDTH_LOGO once a logo is uploaded in the Dashboard. */
const HEADER = 'BUSINESS_NAME'

if (!TOKEN || !LOCATION) {
  console.error('SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID must be set in .env')
  process.exit(1)
}

const db = new PrismaClient()

async function settings() {
  const rows = await db.setting.findMany()
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const money = (cents) => `$${(Number(cents) / 100).toFixed(2)}`
  const flat = byKey.get('shipping_flat_cents') ?? '695'
  const free = byKey.get('free_shipping_threshold_cents') ?? '7500'
  return {
    email: byKey.get('store_email') ?? 'support@hennysmcandles.com',
    shipping:
      Number(free) > 0
        ? `Standard shipping is a flat ${money(flat)} and arrives in two to five business days. Orders over ${money(free)} ship free. We currently ship within the United States only.`
        : `Standard shipping is a flat ${money(flat)} and arrives in two to five business days. We currently ship within the United States only.`,
  }
}

async function square(path, method, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': '2025-01-23',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json()
  if (payload.errors) {
    console.error(`${method} ${path} failed:`)
    console.error(JSON.stringify(payload.errors, null, 2))
    process.exitCode = 1
    return null
  }
  return payload
}

const shop = await settings()

console.log(`\nBranding Square checkout — ${SANDBOX ? 'SANDBOX' : 'PRODUCTION'}\n`)

/*
 * Policies are a list Square *appends* to, not one it replaces. Sending two
 * policies twice leaves four, and the third attempt is rejected outright
 * ("Too many policies, max 2"). So the existing ones are read first and their
 * uids reused, which turns each send into an update of the same two entries —
 * making this script safe to run as often as the wording changes.
 */
const current = await square(
  `/v2/online-checkout/location-settings/${LOCATION}`,
  'GET',
)
const existingUids = (current?.location_settings?.policies ?? []).map((p) => p.uid)

if (existingUids.length > 2) {
  console.log(
    `  note: this location had ${existingUids.length} policies from earlier runs;\n` +
      `        the first two are being reused and the rest cleared.\n`,
  )
}

const updated = await square(
  `/v2/online-checkout/location-settings/${LOCATION}`,
  'PUT',
  {
    location_settings: {
      branding: {
        header_type: HEADER,
        button_color: GILD,
        button_shape: BUTTON_SHAPE,
      },
      // A note field earns its place on a shop that sells gifts.
      customer_notes_enabled: true,
      // Tipping belongs at a counter, not on a candle sent by post.
      tipping: { allow_tipping: false },
      // Our own promo codes are validated against our own rules before Square
      // is ever called. A second, unrelated discount box on the same page is
      // just a way for a customer to be told "no" twice.
      coupons: { enabled: false },
      policies: [
        {
          ...(existingUids[0] ? { uid: existingUids[0] } : {}),
          title: 'Shipping',
          description: shop.shipping.slice(0, 1024),
        },
        {
          ...(existingUids[1] ? { uid: existingUids[1] } : {}),
          title: 'Returns',
          description:
            `Unused, unburned candles can be returned within 30 days for a full refund of the item price. If something arrives broken, send a photo within 14 days and it will be replaced or refunded. Write to ${shop.email}.`.slice(
              0,
              1024,
            ),
        },
      ],
    },
  },
)

if (updated?.location_settings) {
  const s = updated.location_settings
  console.log('  header        ', s.branding?.header_type)
  console.log('  button        ', s.branding?.button_color, s.branding?.button_shape)
  console.log('  customer notes', s.customer_notes_enabled)
  console.log('  tipping        ', s.tipping?.allow_tipping ?? false)
  console.log('  coupons        ', s.coupons?.enabled ?? false)
  console.log('  policies      ', (s.policies ?? []).map((p) => p.title).join(', '))
}

// Merchant-level settings decide which payment methods appear. Apple Pay,
// Google Pay and Cash App Pay cost nothing extra and lift completion on
// phones, which is where most of this shop's traffic will be.
const merchant = await square('/v2/online-checkout/merchant-settings', 'GET')
if (merchant?.merchant_settings) {
  const methods = merchant.merchant_settings.payment_methods ?? {}
  console.log('\n  payment methods on this account:')
  for (const [name, value] of Object.entries(methods)) {
    const enabled = typeof value === 'object' ? value.enabled : value
    console.log(`    ${name.padEnd(18)} ${enabled ? 'on' : 'off'}`)
  }
  console.log(
    '\n  Any showing "off" are switched on in the Square Dashboard under\n' +
      '  Settings → Checkout → Payment methods. They are not writable by API.',
  )
}

console.log()
await db.$disconnect()
