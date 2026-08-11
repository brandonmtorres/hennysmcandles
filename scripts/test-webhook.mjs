/**
 * End-to-end test of the order pipeline without a live Stripe account.
 *
 * Builds a genuine `checkout.session.completed` payload, signs it with the
 * configured webhook secret exactly as Stripe does, and posts it. Then checks
 * that the order was created, stock moved, the email rendered, and that a
 * replay of the same event changes nothing.
 */
import crypto from 'node:crypto'
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

const SECRET = env.STRIPE_WEBHOOK_SECRET
const URL = 'http://localhost:3000/api/webhooks/stripe'
const db = new PrismaClient()

const pass = (m) => console.log(`  [32m✓[0m ${m}`)
const fail = (m) => {
  console.log(`  [31m✗ ${m}[0m`)
  process.exitCode = 1
}

function sign(payload) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

async function post(payload, signature) {
  return fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'stripe-signature': signature } : {}),
    },
    body: payload,
  })
}

function buildEvent(eventId, sessionId, items, totals) {
  return JSON.stringify({
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        payment_intent: `pi_test_${sessionId.slice(-8)}`,
        currency: 'usd',
        amount_subtotal: totals.subtotal,
        amount_total: totals.total,
        total_details: { amount_shipping: totals.shipping, amount_tax: 0, amount_discount: 0 },
        customer_details: {
          email: 'buyer@example.com',
          name: 'Test Buyer',
          address: {
            line1: '12 Moonlight Lane',
            line2: null,
            city: 'Portland',
            state: 'OR',
            postal_code: '97201',
            country: 'US',
          },
        },
        metadata: { cart: JSON.stringify(items.map((i) => ({ id: i.id, q: i.q }))) },
      },
    },
  })
}

console.log('\nOrder pipeline — signed webhook test\n')

// --- Fixture ---------------------------------------------------------------
const product = await db.product.findFirst({
  where: { slug: 'black-sea-mist' },
})
if (!product) {
  console.error('Seed data missing. Run: npm run db:seed')
  process.exit(1)
}

const stockBefore = product.stock
const QTY = 3
const unit = product.onSale && product.salePercent > 0
  ? Math.round(product.priceCents * (1 - product.salePercent / 100))
  : product.priceCents
const subtotal = unit * QTY
const totals = { subtotal, shipping: 0, total: subtotal }

const sessionId = `cs_test_${Date.now()}`
const eventId = `evt_test_${Date.now()}`
const payload = buildEvent(eventId, sessionId, [{ id: product.id, q: QTY }], totals)

console.log(`Fixture: ${product.name} · stock ${stockBefore} · buying ${QTY}\n`)

// --- 1. Reject an unsigned request ----------------------------------------
console.log('Signature verification')
{
  const res = await post(payload, null)
  res.status === 400
    ? pass('unsigned request rejected (400)')
    : fail(`unsigned request returned ${res.status}, expected 400`)
}
{
  const res = await post(payload, 't=1,v1=deadbeef')
  res.status === 400
    ? pass('bad signature rejected (400)')
    : fail(`bad signature returned ${res.status}, expected 400`)
}
{
  // A valid signature over different content must not validate.
  const res = await post(payload.replace('"amount_total":' + totals.total, '"amount_total":1'), sign(payload))
  res.status === 400
    ? pass('tampered payload rejected (400)')
    : fail(`tampered payload returned ${res.status}, expected 400`)
}

// --- 2. Process a genuine event -------------------------------------------
console.log('\nOrder creation')
{
  const res = await post(payload, sign(payload))
  res.ok ? pass('signed event accepted (200)') : fail(`signed event returned ${res.status}`)
}

await new Promise((r) => setTimeout(r, 700))

const order = await db.order.findUnique({
  where: { stripeSessionId: sessionId },
  include: { items: true },
})

if (!order) {
  fail('no order was created')
} else {
  pass(`order ${order.orderNumber} created`)
  order.status === 'PAID' ? pass('status is PAID') : fail(`status is ${order.status}`)
  order.totalCents === totals.total
    ? pass(`total ${order.totalCents} matches`)
    : fail(`total ${order.totalCents} != ${totals.total}`)
  order.items.length === 1 && order.items[0].quantity === QTY
    ? pass('line item recorded with correct quantity')
    : fail('line items are wrong')
  order.email === 'buyer@example.com'
    ? pass('customer email captured')
    : fail('customer email missing')
  order.shippingAddress?.includes('Moonlight')
    ? pass('shipping address captured')
    : fail('shipping address missing')
}

// --- 3. Stock movement -----------------------------------------------------
console.log('\nStock')
{
  const after = await db.product.findUnique({ where: { id: product.id } })
  after.stock === stockBefore - QTY
    ? pass(`stock ${stockBefore} → ${after.stock} (−${QTY})`)
    : fail(`stock is ${after.stock}, expected ${stockBefore - QTY}`)
}

// --- 4. Idempotency --------------------------------------------------------
console.log('\nReplay protection')
{
  const res = await post(payload, sign(payload))
  const body = await res.json()
  res.ok && body.duplicate
    ? pass('replayed event acknowledged as duplicate')
    : fail(`replay returned ${res.status} ${JSON.stringify(body)}`)

  await new Promise((r) => setTimeout(r, 400))
  const after = await db.product.findUnique({ where: { id: product.id } })
  after.stock === stockBefore - QTY
    ? pass('stock unchanged by replay')
    : fail(`replay moved stock to ${after.stock}`)

  const count = await db.order.count({ where: { stripeSessionId: sessionId } })
  count === 1 ? pass('no duplicate order') : fail(`${count} orders for one session`)
}

// --- 5. A different event id, same session (Stripe can do this) ------------
console.log('\nSame session under a new event id')
{
  const payload2 = buildEvent(`evt_test_${Date.now()}_b`, sessionId, [{ id: product.id, q: QTY }], totals)
  const res = await post(payload2, sign(payload2))
  res.ok ? pass('accepted (200)') : fail(`returned ${res.status}`)

  await new Promise((r) => setTimeout(r, 400))
  const after = await db.product.findUnique({ where: { id: product.id } })
  after.stock === stockBefore - QTY
    ? pass('stock still unchanged — guarded by the unique session id')
    : fail(`stock drifted to ${after.stock}`)

  const count = await db.order.count({ where: { stripeSessionId: sessionId } })
  count === 1 ? pass('still exactly one order') : fail(`${count} orders`)
}

// --- 6. Emails -------------------------------------------------------------
console.log('\nEmail')
{
  const dir = '.mail-preview'
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  const confirmation = files.find((f) => f.includes('confirmed'))
  confirmation
    ? pass(`confirmation rendered → ${dir}/${confirmation}`)
    : fail('no confirmation email was rendered')

  if (confirmation) {
    const html = fs.readFileSync(`${dir}/${confirmation}`, 'utf8')
    html.includes(order.orderNumber)
      ? pass('email contains the order number')
      : fail('email is missing the order number')
    html.includes('Black Sea Mist')
      ? pass('email lists the purchased candle')
      : fail('email is missing the line item')
  }

  const reloaded = await db.order.findUnique({ where: { stripeSessionId: sessionId } })
  reloaded?.confirmationEmailSentAt
    ? pass('order marked as confirmation-sent')
    : fail('confirmationEmailSentAt not set')
}

// --- 7. Refund returns stock ----------------------------------------------
console.log('\nRefund')
{
  const refundPayload = JSON.stringify({
    id: `evt_refund_${Date.now()}`,
    object: 'event',
    type: 'charge.refunded',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'ch_test_1',
        object: 'charge',
        payment_intent: `pi_test_${sessionId.slice(-8)}`,
        refunded: true,
      },
    },
  })
  const res = await post(refundPayload, sign(refundPayload))
  res.ok ? pass('refund event accepted') : fail(`refund returned ${res.status}`)

  await new Promise((r) => setTimeout(r, 600))
  const after = await db.product.findUnique({ where: { id: product.id } })
  after.stock === stockBefore
    ? pass(`stock restored to ${after.stock}`)
    : fail(`stock is ${after.stock}, expected ${stockBefore}`)

  const refunded = await db.order.findUnique({ where: { stripeSessionId: sessionId } })
  refunded?.status === 'REFUNDED'
    ? pass('order marked REFUNDED')
    : fail(`order status is ${refunded?.status}`)
}

// --- Cleanup ---------------------------------------------------------------
await db.order.deleteMany({ where: { stripeSessionId: sessionId } })
await db.processedWebhook.deleteMany({ where: { id: { startsWith: 'evt_test' } } })
await db.processedWebhook.deleteMany({ where: { id: { startsWith: 'evt_refund' } } })
await db.product.update({ where: { id: product.id }, data: { stock: stockBefore } })

console.log(
  process.exitCode ? '\n[31mSome checks failed.[0m\n' : '\n[32mAll checks passed.[0m\n',
)
await db.$disconnect()
