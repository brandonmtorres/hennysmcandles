/**
 * End-to-end test of the order pipeline without a Square account.
 *
 * It stands up two things and points the app at them:
 *
 *   · a stub of Square's own API, which serves payments, orders and refunds
 *     in exactly the snake_case shape Square returns, and records the payment
 *     links the app asks it to create;
 *   · the built app itself, started with that stub as its Square.
 *
 * Then it drives the whole path a real order takes — priced checkout, signed
 * webhook, stock movement, replays, refunds — and asserts what came out. The
 * signatures are computed the way Square computes them (HMAC-SHA256 over the
 * notification URL concatenated with the raw body), so the verification code
 * is genuinely exercised rather than bypassed.
 *
 * Run it with:  npm run test:webhook
 */
import crypto from 'node:crypto'
import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const APP_PORT = 3100
const STUB_PORT = 4321
const SIGNATURE_KEY = 'test-signature-key-not-a-real-one'
const NOTIFICATION_URL = `http://localhost:${APP_PORT}/api/webhooks/square`
const CHECKOUT_URL = `http://localhost:${APP_PORT}/api/checkout`

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

const db = new PrismaClient()

let passed = 0
let failed = 0
const pass = (m) => {
  passed += 1
  console.log(`  \x1b[32m✓\x1b[0m ${m}`)
}
const fail = (m) => {
  failed += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
  process.exitCode = 1
}
const section = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`)

// ---------------------------------------------------------------------------
// The Square stub
// ---------------------------------------------------------------------------

/** Everything the stub will serve, keyed by id. Tests mutate this directly. */
const square = {
  payments: new Map(),
  orders: new Map(),
  refunds: new Map(),
  /** Payment-link requests the app made, newest last. */
  linkRequests: [],
}

function money(cents, currency = 'USD') {
  return { amount: cents, currency }
}

/** A completed payment and its order, as Square would return them. */
function seedPayment({
  paymentId,
  orderId,
  totalCents,
  taxCents = 0,
  discountCents = 0,
  shippingCents = 0,
  state = 'OR',
  country = 'US',
  email = 'buyer@example.com',
  refundedCents = 0,
}) {
  square.payments.set(paymentId, {
    id: paymentId,
    status: 'COMPLETED',
    order_id: orderId,
    amount_money: money(totalCents),
    total_money: money(totalCents),
    refunded_money: money(refundedCents),
    buyer_email_address: email,
    shipping_address: {
      first_name: 'Test',
      last_name: 'Buyer',
      address_line_1: '12 Moonlight Lane',
      locality: 'Portland',
      administrative_district_level_1: state,
      postal_code: '97201',
      country,
    },
  })

  square.orders.set(orderId, {
    id: orderId,
    location_id: 'L-TEST',
    state: 'COMPLETED',
    total_money: money(totalCents),
    total_tax_money: money(taxCents),
    total_discount_money: money(discountCents),
    total_service_charge_money: money(shippingCents),
    fulfillments: [
      {
        type: 'SHIPMENT',
        shipment_details: {
          recipient: { display_name: 'Test Buyer', email_address: email },
        },
      },
    ],
  })
}

function startStub() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${STUB_PORT}`)
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    // Create a payment link.
    if (req.method === 'POST' && url.pathname === '/v2/online-checkout/payment-links') {
      let raw = ''
      req.on('data', (chunk) => (raw += chunk))
      req.on('end', () => {
        const body = JSON.parse(raw || '{}')
        square.linkRequests.push(body)
        const orderId = `sq-order-${square.linkRequests.length}`
        send(200, {
          payment_link: {
            id: `sq-link-${square.linkRequests.length}`,
            version: 1,
            order_id: orderId,
            url: `https://squareup.test/checkout/${orderId}`,
          },
        })
      })
      return
    }

    const payment = url.pathname.match(/^\/v2\/payments\/([^/]+)$/)
    if (req.method === 'GET' && payment) {
      const found = square.payments.get(payment[1])
      return found ? send(200, { payment: found }) : send(404, { errors: [] })
    }

    const order = url.pathname.match(/^\/v2\/orders\/([^/]+)$/)
    if (req.method === 'GET' && order) {
      const found = square.orders.get(order[1])
      return found ? send(200, { order: found }) : send(404, { errors: [] })
    }

    const refund = url.pathname.match(/^\/v2\/refunds\/([^/]+)$/)
    if (req.method === 'GET' && refund) {
      const found = square.refunds.get(refund[1])
      return found ? send(200, { refund: found }) : send(404, { errors: [] })
    }

    send(404, { errors: [{ detail: `stub has no route for ${req.method} ${url.pathname}` }] })
  })

  return new Promise((resolve) => server.listen(STUB_PORT, () => resolve(server)))
}

// ---------------------------------------------------------------------------
// The app under test
// ---------------------------------------------------------------------------

function startApp() {
  const child = spawn('npx', ['next', 'start', '-p', String(APP_PORT)], {
    // Its own process group: `npx` spawns Next as a child of itself, and
    // signalling only the npx process leaves the server holding the port.
    detached: true,
    env: {
      ...process.env,
      DATABASE_URL: env.DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${APP_PORT}`,
      SQUARE_ACCESS_TOKEN: 'stub-token',
      SQUARE_LOCATION_ID: 'L-TEST',
      SQUARE_ENVIRONMENT: 'sandbox',
      SQUARE_BASE_URL: `http://localhost:${STUB_PORT}`,
      SQUARE_WEBHOOK_SIGNATURE_KEY: SIGNATURE_KEY,
      SQUARE_WEBHOOK_URL: NOTIFICATION_URL,
      // The curtain and the mailer both stay out of the way.
      SITE_PASSWORD: '',
      RESEND_API_KEY: '',
      OWNER_NOTIFICATION_EMAIL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', () => {})
  child.stderr.on('data', (chunk) => {
    const text = String(chunk)
    if (text.includes('Error') && !text.includes('ExperimentalWarning')) {
      console.error(`  [app] ${text.trim()}`)
    }
  })

  return child
}

async function waitForApp(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${APP_PORT}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      // Any answer at all means it is listening.
      if (response.status > 0) return true
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Signing, exactly as Square does it
// ---------------------------------------------------------------------------

function sign(body) {
  return crypto
    .createHmac('sha256', SIGNATURE_KEY)
    .update(NOTIFICATION_URL + body)
    .digest('base64')
}

function event(type, id, eventId) {
  return JSON.stringify({
    merchant_id: 'MERCHANT-TEST',
    type,
    event_id: eventId,
    created_at: new Date().toISOString(),
    data: { type: type.split('.')[0], id },
  })
}

async function postEvent(body, signature = sign(body)) {
  return fetch(NOTIFICATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature === null ? {} : { 'x-square-hmacsha256-signature': signature }),
    },
    body,
  })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_SLUG = 'test-webhook-candle'
const FIXTURE_SLUG_2 = 'test-webhook-candle-two'

async function resetFixtures() {
  await db.orderItem.deleteMany({ where: { slug: { startsWith: 'test-webhook-' } } })
  const orders = await db.order.findMany({
    where: { email: { contains: '@example.com' } },
    select: { id: true },
  })
  await db.orderItem.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
  await db.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } })
  await db.checkoutSession.deleteMany({})
  await db.processedWebhook.deleteMany({})
  await db.promoRedemption.deleteMany({ where: { email: { contains: '@example.com' } } })
  await db.product.deleteMany({ where: { slug: { startsWith: 'test-webhook-' } } })
  await db.promoCode.deleteMany({ where: { code: 'TESTTEN' } })
  // Reset at the start, not only at the end: a run must not depend on the
  // previous run having exited cleanly, or the first order number drifts.
  await db.counter.deleteMany({ where: { name: 'order' } })
  await db.setting.deleteMany({
    where: { key: { in: ['tax_percent', 'tax_home_state', 'shipping_flat_cents', 'free_shipping_threshold_cents'] } },
  })

  const product = await db.product.create({
    data: {
      slug: FIXTURE_SLUG,
      name: 'Test Candle',
      tagline: 'For tests only',
      scent: 'Test',
      description: 'Test',
      story: 'Test',
      priceCents: 3200,
      stock: 10,
      visibility: 'VISIBLE',
    },
  })

  const second = await db.product.create({
    data: {
      slug: FIXTURE_SLUG_2,
      name: 'Test Candle Two',
      tagline: 'For tests only',
      scent: 'Test',
      description: 'Test',
      story: 'Test',
      priceCents: 5000,
      stock: 4,
      visibility: 'VISIBLE',
    },
  })

  await db.promoCode.create({
    data: { code: 'TESTTEN', kind: 'PERCENT', value: 10, active: true },
  })

  // A shop in Oregon charging 5% — enough to prove the rule applies at home
  // and nowhere else.
  await db.setting.createMany({
    data: [
      { key: 'tax_percent', value: '5' },
      { key: 'tax_home_state', value: 'OR' },
      { key: 'shipping_flat_cents', value: '695' },
      { key: 'free_shipping_threshold_cents', value: '7500' },
    ],
  })

  return { product, second }
}

/**
 * Puts the shop back as it was found.
 *
 * The run switches tax on to prove the rule, and a developer who then opened
 * the site would see a tax line appear from nowhere. Only rows this script
 * created are touched.
 */
async function removeFixtures() {
  try {
    const orders = await db.order.findMany({
      where: { email: { contains: '@example.com' } },
      select: { id: true },
    })
    await db.orderItem.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } })
    await db.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } })
    await db.promoRedemption.deleteMany({ where: { email: { contains: '@example.com' } } })
    await db.checkoutSession.deleteMany({})
    await db.processedWebhook.deleteMany({})
    await db.promoCode.deleteMany({ where: { code: 'TESTTEN' } })
    await db.product.deleteMany({ where: { slug: { startsWith: 'test-webhook-' } } })
    await db.setting.deleteMany({ where: { key: { in: ['tax_percent', 'tax_home_state'] } } })
    await db.counter.deleteMany({ where: { name: 'order' } })
  } catch {
    // Tidying is best effort; a failure here must not mask a test result.
  }
}

/** Writes the quote the checkout route would have written. */
async function seedSession({ items, totals, state = 'OR', promoCodeId = null, promoCode = null }) {
  return db.checkoutSession.create({
    data: {
      cart: JSON.stringify(items),
      promoCodeId,
      promoCode,
      subtotalCents: totals.subtotal,
      shippingCents: totals.shipping ?? 0,
      taxCents: totals.tax ?? 0,
      discountCents: totals.discount ?? 0,
      totalCents: totals.total,
      currency: 'usd',
      shipToState: state,
      squareOrderId: totals.orderId,
      squarePaymentLinkId: 'sq-link-test',
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  })
}

// ---------------------------------------------------------------------------

/**
 * A port left occupied by an earlier run is the one failure that looks like a
 * hundred real ones: the tests would talk to a stale app pointed at a stub
 * that no longer exists. Checked first, and loudly.
 */
async function requireFreePort(port, what) {
  const inUse = await new Promise((resolve) => {
    const probe = http
      .createServer()
      .once('error', (error) => resolve(error.code === 'EADDRINUSE'))
      .once('listening', () => probe.close(() => resolve(false)))
      .listen(port)
  })
  if (inUse) {
    console.error(
      `\n\x1b[31mPort ${port} is already in use (${what}).\x1b[0m\n` +
        `Something from an earlier run is still going. Stop it, then try again.\n`,
    )
    process.exit(1)
  }
}

console.log('\nOrder pipeline — Square stub, signed webhooks\n')

await requireFreePort(APP_PORT, 'the app under test')
await requireFreePort(STUB_PORT, 'the Square stub')

const stub = await startStub()
const app = startApp()

function stopApp() {
  try {
    // Negative pid signals the whole group, which is what actually stops Next.
    process.kill(-app.pid, 'SIGKILL')
  } catch {
    // Already gone.
  }
}

const cleanup = async () => {
  await removeFixtures()
  stopApp()
  // Keep-alive sockets would otherwise hold the process open long after the
  // last assertion.
  stub.closeAllConnections?.()
  stub.close()
  await db.$disconnect()
}

process.on('exit', stopApp)

try {
  if (!(await waitForApp())) {
    fail('the app did not start — run `npm run build` first')
    await cleanup()
    process.exit(1)
  }

  const { product, second } = await resetFixtures()

  // -------------------------------------------------------------------------
  section('Checkout pricing')

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        state: 'OR',
      }),
    })
    const payload = await response.json()
    const sent = square.linkRequests.at(-1)
    const session = await db.checkoutSession.findFirst({ orderBy: { createdAt: 'desc' } })

    if (response.ok && typeof payload.url === 'string') pass('checkout returns a payment link')
    else fail(`checkout failed: ${JSON.stringify(payload)}`)

    // 3200 goods, under the free-shipping threshold, 5% tax in the home state.
    if (session?.subtotalCents === 3200 && session.shippingCents === 695) {
      pass('shipping is the flat rate below the free-shipping threshold')
    } else {
      fail(`shipping wrong: ${session?.shippingCents} on subtotal ${session?.subtotalCents}`)
    }

    if (session?.taxCents === 160) pass('tax is charged in the home state (5% of $32.00)')
    else fail(`home-state tax wrong: expected 160, got ${session?.taxCents}`)

    if (session?.totalCents === 3200 + 695 + 160) pass('total adds up')
    else fail(`total wrong: ${session?.totalCents}`)

    if (sent?.order?.taxes?.[0]?.percentage === '5') {
      pass('Square is sent the tax as a rate, order-scoped')
    } else {
      fail(`tax not sent to Square: ${JSON.stringify(sent?.order?.taxes)}`)
    }

    if (sent?.checkout_options?.shipping_fee?.charge?.amount === 695) {
      pass('shipping is sent as a shipping fee')
    } else {
      fail(`shipping fee not sent: ${JSON.stringify(sent?.checkout_options?.shipping_fee)}`)
    }

    if (sent?.order?.reference_id === session?.id) {
      pass('the order carries our checkout session id as its reference')
    } else {
      fail('reference id does not match the checkout session')
    }
  }

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        state: 'CA',
      }),
    })
    await response.json()
    const session = await db.checkoutSession.findFirst({ orderBy: { createdAt: 'desc' } })
    if (session?.taxCents === 0) pass('no tax outside the home state')
    else fail(`out-of-state tax wrongly charged: ${session?.taxCents}`)
  }

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 3 }],
        state: 'OR',
      }),
    })
    const session = await db.checkoutSession.findFirst({ orderBy: { createdAt: 'desc' } })
    await response.json()
    if (session?.shippingCents === 0) pass('shipping is free above the threshold')
    else fail(`free shipping not applied: ${session?.shippingCents}`)
  }

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        state: 'XX',
      }),
    })
    if (response.status === 400) pass('an unknown state is refused')
    else fail(`bad state accepted with ${response.status}`)
  }

  {
    // Tax is configured, so the destination decides the amount and must be
    // known before payment.
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
    })
    if (response.status === 400) pass('with tax on, a missing destination is refused')
    else fail(`missing destination accepted with ${response.status}`)
  }

  {
    // With no home state configured the shop charges nobody, so the question
    // is not worth asking and Square collects the address instead.
    await db.setting.deleteMany({ where: { key: 'tax_home_state' } })

    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
    })
    const payload = await response.json()
    const session = await db.checkoutSession.findFirst({ orderBy: { createdAt: 'desc' } })

    if (response.ok && payload.url) pass('with tax off, no destination is needed')
    else fail(`checkout without a destination failed: ${JSON.stringify(payload)}`)

    if (session?.shipToState === '' && session.taxCents === 0) {
      pass('and nothing is charged as tax')
    } else {
      fail(`untaxed checkout recorded state "${session?.shipToState}" tax ${session?.taxCents}`)
    }

    const sent = square.linkRequests.at(-1)
    if (!sent?.order?.taxes) pass('and Square is sent no tax line at all')
    else fail('a tax line was sent to Square with tax switched off')

    // Put it back for the rest of the run.
    await db.setting.create({ data: { key: 'tax_home_state', value: 'OR' } })
  }

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: second.id, quantity: 9 }],
        state: 'OR',
      }),
    })
    if (response.status === 409) pass('a cart larger than the stock is refused')
    else fail(`overselling accepted with ${response.status}`)
  }

  {
    const response = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        state: 'OR',
        code: 'TESTTEN',
      }),
    })
    await response.json()
    const session = await db.checkoutSession.findFirst({ orderBy: { createdAt: 'desc' } })
    const sent = square.linkRequests.at(-1)
    if (session?.discountCents === 320) pass('a promo code discounts the quote')
    else fail(`promo discount wrong: ${session?.discountCents}`)
    if (session?.taxCents === 144) pass('tax is charged after the discount, not before')
    else fail(`tax after discount wrong: expected 144, got ${session?.taxCents}`)
    if (sent?.order?.discounts?.[0]?.amount_money?.amount === 320) {
      pass('the discount is sent to Square as a fixed amount')
    } else {
      fail('discount not sent to Square')
    }
  }

  // -------------------------------------------------------------------------
  section('Signature verification')

  {
    const body = event('payment.updated', 'pay-unsigned', 'evt-unsigned')
    const response = await postEvent(body, null)
    if (response.status === 400) pass('an unsigned request is rejected')
    else fail(`unsigned request returned ${response.status}`)
  }

  {
    const body = event('payment.updated', 'pay-badsig', 'evt-badsig')
    const response = await postEvent(body, Buffer.from('wrong').toString('base64'))
    if (response.status === 400) pass('a wrongly signed request is rejected')
    else fail(`bad signature returned ${response.status}`)
  }

  {
    // The URL is part of what Square signs, so a signature computed over a
    // different URL must fail even with the right key.
    const body = event('payment.updated', 'pay-wrongurl', 'evt-wrongurl')
    const wrong = crypto
      .createHmac('sha256', SIGNATURE_KEY)
      .update('https://elsewhere.example/api/webhooks/square' + body)
      .digest('base64')
    const response = await postEvent(body, wrong)
    if (response.status === 400) pass('a signature over a different URL is rejected')
    else fail(`wrong-URL signature returned ${response.status}`)
  }

  // -------------------------------------------------------------------------
  section('Order creation')

  await db.product.update({ where: { id: product.id }, data: { stock: 10 } })

  {
    seedPayment({
      paymentId: 'pay-1',
      orderId: 'sqo-1',
      totalCents: 3200 + 695 + 160,
      taxCents: 160,
      shippingCents: 695,
      state: 'OR',
    })
    await seedSession({
      items: [
        { id: product.id, q: 1, unit: 3200, name: 'Test Candle', slug: FIXTURE_SLUG },
      ],
      totals: { subtotal: 3200, shipping: 695, tax: 160, total: 4055, orderId: 'sqo-1' },
    })

    const response = await postEvent(event('payment.updated', 'pay-1', 'evt-1'))
    const order = await db.order.findUnique({
      where: { squareOrderId: 'sqo-1' },
      include: { items: true },
    })
    const after = await db.product.findUnique({ where: { id: product.id } })

    if (response.status === 200) pass('a signed payment event is accepted')
    else fail(`signed event returned ${response.status}`)

    if (order) pass('the order is created')
    else fail('no order was created')

    if (order?.status === 'PAID') pass('the order is marked paid')
    else fail(`order status is ${order?.status}`)

    if (order?.totalCents === 4055 && order.taxCents === 160 && order.shippingCents === 695) {
      pass("the order records Square's own figures")
    } else {
      fail(`order totals wrong: ${JSON.stringify(order && { t: order.totalCents, tax: order.taxCents })}`)
    }

    if (order?.items.length === 1 && order.items[0].unitPriceCents === 3200) {
      pass('the line items come back from the quote, priced as quoted')
    } else {
      fail('line items wrong')
    }

    if (after?.stock === 9) pass('stock is decremented')
    else fail(`stock is ${after?.stock}, expected 9`)

    if (order?.addressFlagged === false) pass('a matching address is not flagged')
    else fail('a matching address was wrongly flagged')

    if (/^HM-\d+$/.test(order?.orderNumber ?? '')) pass(`order number issued (${order?.orderNumber})`)
    else fail(`order number malformed: ${order?.orderNumber}`)

    const session = await db.checkoutSession.findUnique({ where: { squareOrderId: 'sqo-1' } })
    if (session?.status === 'COMPLETED') pass('the checkout session is closed')
    else fail(`checkout session left ${session?.status}`)
  }

  {
    const response = await postEvent(event('payment.updated', 'pay-1', 'evt-1'))
    const payload = await response.json()
    const count = await db.order.count({ where: { squareOrderId: 'sqo-1' } })
    const stock = (await db.product.findUnique({ where: { id: product.id } }))?.stock
    if (payload.duplicate === true) pass('a replayed event id is recognised')
    else fail('replay was not recognised as a duplicate')
    if (count === 1 && stock === 9) pass('a replay changes nothing')
    else fail(`replay changed things: ${count} orders, stock ${stock}`)
  }

  {
    // A different event id for the same payment — Square does this when a
    // payment is updated after completion.
    const response = await postEvent(event('payment.updated', 'pay-1', 'evt-1-again'))
    const count = await db.order.count({ where: { squareOrderId: 'sqo-1' } })
    const stock = (await db.product.findUnique({ where: { id: product.id } }))?.stock
    if (response.status === 200 && count === 1 && stock === 9) {
      pass('a second event for the same payment creates no second order')
    } else {
      fail(`duplicate payment created ${count} orders, stock ${stock}`)
    }
  }

  // -------------------------------------------------------------------------
  section('In-person sales are not web orders')

  {
    // A payment with no checkout session behind it: the card reader at a
    // market. It must not become a web order, and must not move online stock.
    seedPayment({ paymentId: 'pay-pos', orderId: 'sqo-pos', totalCents: 2500 })
    const before = (await db.product.findUnique({ where: { id: product.id } }))?.stock

    const response = await postEvent(event('payment.updated', 'pay-pos', 'evt-pos'))
    const order = await db.order.findUnique({ where: { squareOrderId: 'sqo-pos' } })
    const after = (await db.product.findUnique({ where: { id: product.id } }))?.stock

    if (response.status === 200) pass('an in-person payment is acknowledged')
    else fail(`in-person payment returned ${response.status}`)
    if (!order) pass('no phantom order is created for it')
    else fail('an in-person sale was turned into a web order')
    if (before === after) pass('online stock is untouched by it')
    else fail(`in-person sale moved online stock from ${before} to ${after}`)
  }

  // -------------------------------------------------------------------------
  section('Mismatched destination')

  {
    seedPayment({
      paymentId: 'pay-mismatch',
      orderId: 'sqo-mismatch',
      totalCents: 3895,
      shippingCents: 695,
      state: 'NY',
    })
    await seedSession({
      items: [
        { id: product.id, q: 1, unit: 3200, name: 'Test Candle', slug: FIXTURE_SLUG },
      ],
      totals: { subtotal: 3200, shipping: 695, tax: 0, total: 3895, orderId: 'sqo-mismatch' },
      state: 'OR',
    })

    await postEvent(event('payment.updated', 'pay-mismatch', 'evt-mismatch'))
    const order = await db.order.findUnique({ where: { squareOrderId: 'sqo-mismatch' } })
    if (order?.addressFlagged === true) {
      pass('an address that contradicts the quote is flagged for the owner')
    } else {
      fail('a contradicting address was not flagged')
    }
  }

  // -------------------------------------------------------------------------
  section('Refunds')

  {
    // Partial: goodwill, nothing coming back, so stock must not move.
    const before = (await db.product.findUnique({ where: { id: product.id } }))?.stock
    square.payments.get('pay-1').refunded_money = money(1000)
    square.refunds.set('ref-partial', {
      id: 'ref-partial',
      status: 'COMPLETED',
      payment_id: 'pay-1',
      order_id: 'sqo-1',
      amount_money: money(1000),
    })

    await postEvent(event('refund.updated', 'ref-partial', 'evt-ref-1'))
    const order = await db.order.findUnique({ where: { squareOrderId: 'sqo-1' } })
    const after = (await db.product.findUnique({ where: { id: product.id } }))?.stock

    if (order?.status === 'PARTIALLY_REFUNDED') pass('a partial refund marks the order part refunded')
    else fail(`partial refund set status to ${order?.status}`)
    if (order?.refundedCents === 1000) pass('the refunded amount is recorded')
    else fail(`refunded amount is ${order?.refundedCents}`)
    if (before === after) pass('a partial refund does not restock')
    else fail(`partial refund moved stock from ${before} to ${after}`)
  }

  {
    // A replayed partial refund must not double-count.
    await postEvent(event('refund.created', 'ref-partial', 'evt-ref-1-replay'))
    const order = await db.order.findUnique({ where: { squareOrderId: 'sqo-1' } })
    if (order?.refundedCents === 1000) pass('a replayed refund does not double-count')
    else fail(`replayed refund produced ${order?.refundedCents}`)
  }

  {
    // Full: the candle is coming back, so the stock does too.
    const before = (await db.product.findUnique({ where: { id: product.id } }))?.stock
    square.payments.get('pay-1').refunded_money = money(4055)
    square.refunds.set('ref-full', {
      id: 'ref-full',
      status: 'COMPLETED',
      payment_id: 'pay-1',
      order_id: 'sqo-1',
      amount_money: money(3055),
    })

    await postEvent(event('refund.updated', 'ref-full', 'evt-ref-2'))
    const order = await db.order.findUnique({ where: { squareOrderId: 'sqo-1' } })
    const after = (await db.product.findUnique({ where: { id: product.id } }))?.stock

    if (order?.status === 'REFUNDED') pass('a full refund marks the order refunded')
    else fail(`full refund set status to ${order?.status}`)
    if (after === before + 1) pass('a full refund puts the stock back')
    else fail(`stock went from ${before} to ${after}`)

    // And again — the restock must not repeat.
    await postEvent(event('refund.updated', 'ref-full', 'evt-ref-2-replay'))
    const finalStock = (await db.product.findUnique({ where: { id: product.id } }))?.stock
    if (finalStock === after) pass('a replayed full refund does not restock twice')
    else fail(`replayed full refund restocked again: ${finalStock}`)
  }

  // -------------------------------------------------------------------------
  section('Order numbers')

  {
    // Two payments landing together. The numbers must differ — this is the
    // case the old count()-based scheme got wrong.
    await db.product.update({ where: { id: second.id }, data: { stock: 10 } })

    for (const n of [1, 2]) {
      seedPayment({ paymentId: `pay-race-${n}`, orderId: `sqo-race-${n}`, totalCents: 5000 })
      await seedSession({
        items: [
          { id: second.id, q: 1, unit: 5000, name: 'Test Candle Two', slug: FIXTURE_SLUG_2 },
        ],
        totals: { subtotal: 5000, total: 5000, orderId: `sqo-race-${n}` },
      })
    }

    await Promise.all([
      postEvent(event('payment.updated', 'pay-race-1', 'evt-race-1')),
      postEvent(event('payment.updated', 'pay-race-2', 'evt-race-2')),
    ])

    const orders = await db.order.findMany({
      where: { squareOrderId: { in: ['sqo-race-1', 'sqo-race-2'] } },
      select: { orderNumber: true },
    })

    if (orders.length === 2) pass('both concurrent orders are created')
    else fail(`only ${orders.length} of 2 concurrent orders were created`)

    const numbers = new Set(orders.map((o) => o.orderNumber))
    if (numbers.size === orders.length) pass('concurrent orders get distinct numbers')
    else fail(`order numbers collided: ${[...numbers].join(', ')}`)
  }

  // -------------------------------------------------------------------------
  section('Promo redemption')

  {
    const promo = await db.promoCode.findUnique({ where: { code: 'TESTTEN' } })
    seedPayment({
      paymentId: 'pay-promo',
      orderId: 'sqo-promo',
      totalCents: 2880 + 695,
      discountCents: 320,
      shippingCents: 695,
    })
    await seedSession({
      items: [
        { id: second.id, q: 1, unit: 3200, name: 'Test Candle Two', slug: FIXTURE_SLUG_2 },
      ],
      totals: {
        subtotal: 3200,
        discount: 320,
        shipping: 695,
        total: 3575,
        orderId: 'sqo-promo',
      },
      promoCodeId: promo.id,
      promoCode: 'TESTTEN',
    })

    await postEvent(event('payment.updated', 'pay-promo', 'evt-promo'))
    const after = await db.promoCode.findUnique({ where: { code: 'TESTTEN' } })
    const redemption = await db.promoRedemption.findFirst({ where: { promoCodeId: promo.id } })

    if (after?.timesRedeemed === 1) pass('the code is counted as redeemed once payment lands')
    else fail(`redemption count is ${after?.timesRedeemed}`)
    if (redemption?.discountCents === 320) pass('the redemption records the discount')
    else fail('no redemption row was written')
  }
} catch (error) {
  fail(`the run threw: ${error?.stack ?? error}`)
} finally {
  console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m\n`)
  await cleanup()
  process.exit(failed === 0 ? 0 : 1)
}
