/**
 * Promo codes, end to end through the real API.
 *
 * Seeds a handful of codes covering every refusal path, exercises them against
 * the live endpoint, then cleans up after itself.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = 'http://localhost:3000'
let failures = 0

const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label.padEnd(46)}${detail}`,
  )
}

const day = 24 * 60 * 60 * 1000
const codes = [
  { code: 'TEST-PCT20', kind: 'PERCENT', value: 20, active: true },
  { code: 'TEST-FIXED5', kind: 'FIXED', value: 500, active: true },
  { code: 'TEST-OFF', kind: 'PERCENT', value: 10, active: false },
  { code: 'TEST-MIN', kind: 'PERCENT', value: 10, active: true, minSubtotalCents: 500_00 },
  { code: 'TEST-EXPIRED', kind: 'PERCENT', value: 10, active: true, endsAt: new Date(Date.now() - day) },
  { code: 'TEST-FUTURE', kind: 'PERCENT', value: 10, active: true, startsAt: new Date(Date.now() + day) },
  { code: 'TEST-USEDUP', kind: 'PERCENT', value: 10, active: true, maxRedemptions: 2, timesRedeemed: 2 },
  { code: 'TEST-HUGE', kind: 'FIXED', value: 999_00, active: true },
]

for (const c of codes) {
  await db.promoCode.upsert({ where: { code: c.code }, update: c, create: c })
}

const product = await db.product.findFirst({
  where: { stock: { gt: 0 } },
  include: { collections: { include: { collection: true } } },
})
if (!product) {
  console.error('No purchasable product to test against.')
  process.exit(1)
}

const items = [{ productId: product.id, quantity: 1 }]

async function apply(code) {
  const res = await fetch(`${BASE}/api/promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, items }),
  })
  return { status: res.status, body: await res.json() }
}

// Subtotal as the server computes it, so expectations are exact.
const own = product.onSale ? product.salePercent : 0
const best = product.collections.reduce(
  (m, l) => (l.collection.saleActive ? Math.max(m, l.collection.salePercent) : m),
  0,
)
const pct = Math.max(own, best)
const unit = pct > 0 ? Math.round(product.priceCents * (1 - pct / 100)) : product.priceCents

console.log(`\nPromo codes  (cart: ${product.name} @ $${(unit / 100).toFixed(2)})\n`)

{
  const { status, body } = await apply('TEST-PCT20')
  const expected = Math.round(unit * 0.2)
  check('20% off applies', status === 200 && body.discountCents === expected,
    `−$${((body.discountCents ?? 0) / 100).toFixed(2)}`)
}
{
  const { status, body } = await apply('test-pct20')
  check('lookup is case-insensitive', status === 200 && body.code === 'TEST-PCT20')
}
{
  const { status, body } = await apply('  TEST-PCT20  ')
  check('surrounding spaces are ignored', status === 200 && body.code === 'TEST-PCT20')
}
{
  const { status, body } = await apply('TEST-FIXED5')
  check('fixed $5 off applies', status === 200 && body.discountCents === 500,
    `−$${((body.discountCents ?? 0) / 100).toFixed(2)}`)
}
{
  const { status, body } = await apply('TEST-HUGE')
  check('a discount larger than the cart is capped', status === 200 && body.discountCents === unit,
    `−$${((body.discountCents ?? 0) / 100).toFixed(2)} of $${(unit / 100).toFixed(2)}`)
}

console.log('\nRefusals\n')
for (const [code, label] of [
  ['TEST-NOPE', 'unknown code'],
  ['TEST-OFF', 'switched off'],
  ['TEST-MIN', 'minimum spend not met'],
  ['TEST-EXPIRED', 'expired'],
  ['TEST-FUTURE', 'not started'],
  ['TEST-USEDUP', 'fully redeemed'],
]) {
  const { status, body } = await apply(code)
  check(label, status === 422 && typeof body.error === 'string', `"${body.error ?? ''}"`)
}

console.log('\nCheckout re-validation\n')
{
  // The checkout endpoint must refuse a bad code even though the cart may have
  // shown one as valid earlier.
  const res = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, code: 'TEST-EXPIRED' }),
  })
  const body = await res.json()
  check('checkout rejects an expired code', res.status === 422, `"${body.error ?? ''}"`)
}
{
  const res = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, code: 'TEST-USEDUP' }),
  })
  const body = await res.json()
  check('checkout rejects a used-up code', res.status === 422, `"${body.error ?? ''}"`)
}

await db.promoCode.deleteMany({ where: { code: { startsWith: 'TEST-' } } })
console.log(
  failures === 0
    ? '\n\x1b[32mPromo codes behave.\x1b[0m\n'
    : `\n\x1b[31m${failures} promo check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1
await db.$disconnect()
