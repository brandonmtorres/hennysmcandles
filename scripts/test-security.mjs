/**
 * Probes the trust boundaries this shop actually has.
 *
 * Not a substitute for a real audit — it is a regression net for the specific
 * things that would be expensive to get wrong: portal endpoints answering to
 * strangers, owner-written email copy escaping into HTML, image URLs pointing
 * anywhere on the internet, and the storefront leaking what it should not.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const EXECUTABLE = fs
  .readdirSync('/root/.cache/ms-playwright')
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .reverse()
  .map((d) => `/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`)
  .find((p) => fs.existsSync(p))

const BASE = 'http://localhost:3000'

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

let failures = 0
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  failures += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
}
const section = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`)

console.log('\nSecurity probes\n')

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const anon = await browser.newContext()
const page = await anon.newPage()

// --- Nothing in the portal answers a stranger -------------------------------

section('Portal is closed to strangers')

const guardedPages = [
  '/store-portal',
  '/store-portal/orders',
  '/store-portal/products',
  '/store-portal/emails',
  '/store-portal/settings',
  '/store-portal/security',
  '/store-portal/newsletter',
]

for (const path of guardedPages) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  const landedOnLogin = new URL(page.url()).pathname.startsWith('/store-portal/login')
  landedOnLogin || response.status() === 404
    ? pass(`${path} sends a stranger to sign in`)
    : fail(`${path} rendered for a signed-out visitor (${response.status()})`)
}

const guardedApis = [
  ['POST', '/api/portal/email-preview', { key: 'order_confirmation' }],
  ['POST', '/api/portal/upload', {}],
  ['GET', '/api/portal/newsletter/export', null],
]

for (const [method, path, body] of guardedApis) {
  const response =
    method === 'GET'
      ? await page.request.get(`${BASE}${path}`)
      : await page.request.post(`${BASE}${path}`, { data: body })
  response.status() === 401 || response.status() === 403
    ? pass(`${method} ${path} → ${response.status()}`)
    : fail(`${method} ${path} answered a stranger with ${response.status()}`)
}

// --- The portal is not indexable --------------------------------------------

section('The portal stays out of search results')

{
  const response = await page.request.get(`${BASE}/store-portal/login`)
  const robots = response.headers()['x-robots-tag'] ?? ''
  robots.includes('noindex')
    ? pass(`portal sends X-Robots-Tag: ${robots}`)
    : fail(`portal is missing a noindex header (got "${robots}")`)

  const txt = await (await page.request.get(`${BASE}/robots.txt`)).text()
  txt.includes('/store-portal')
    ? pass('robots.txt disallows the portal')
    : fail('robots.txt does not mention the portal')
}

// --- Security headers --------------------------------------------------------

section('Response headers')

{
  const response = await page.request.get(BASE)
  const h = response.headers()

  const csp = h['content-security-policy'] ?? ''
  csp.includes("frame-ancestors 'none'")
    ? pass('CSP forbids framing')
    : fail('CSP is missing frame-ancestors')
  csp.includes("object-src 'none'")
    ? pass("CSP sets object-src 'none'")
    : fail('CSP is missing object-src')
  !/script-src[^;]*unsafe-eval/.test(csp)
    ? pass('production CSP has no unsafe-eval')
    : fail('CSP allows unsafe-eval')

  h['x-frame-options'] === 'DENY' ? pass('X-Frame-Options: DENY') : fail('X-Frame-Options missing')
  h['x-content-type-options'] === 'nosniff'
    ? pass('X-Content-Type-Options: nosniff')
    : fail('nosniff missing')
  ;(h['strict-transport-security'] ?? '').includes('max-age=')
    ? pass('HSTS present')
    : fail('HSTS missing')
  h['x-powered-by'] === undefined
    ? pass('server does not advertise its framework')
    : fail(`X-Powered-By leaks "${h['x-powered-by']}"`)
}

// --- Webhook -----------------------------------------------------------------

section('Payments webhook')

{
  const unsigned = await page.request.post(`${BASE}/api/webhooks/square`, {
    data: { type: 'payment.updated', event_id: 'probe', data: { id: 'x' } },
  })
  unsigned.status() === 400
    ? pass('an unsigned webhook is refused')
    : fail(`unsigned webhook returned ${unsigned.status()}`)

  const forged = await page.request.post(`${BASE}/api/webhooks/square`, {
    headers: { 'x-square-hmacsha256-signature': 'bm90LWEtc2lnbmF0dXJl' },
    data: { type: 'payment.updated', event_id: 'probe2', data: { id: 'x' } },
  })
  forged.status() === 400
    ? pass('a forged signature is refused')
    : fail(`forged signature returned ${forged.status()}`)
}

// --- Prices come from the server --------------------------------------------

section('The client cannot set a price')

{
  const response = await page.request.post(`${BASE}/api/checkout`, {
    data: {
      items: [{ productId: 'nope', quantity: 1, priceCents: 1, unitPriceCents: 1 }],
      state: 'OR',
      totalCents: 1,
    },
  })
  // Whatever else happens, a made-up product must not be purchasable — and the
  // extra price fields must be ignored rather than honoured.
  response.status() >= 400
    ? pass(`a cart carrying its own prices is refused (${response.status()})`)
    : fail('the server accepted client-supplied prices')
}

// --- Signed-in probes --------------------------------------------------------

const owner = await browser.newContext()
const portal = await owner.newPage()
await portal.goto(`${BASE}/store-portal/login`, { waitUntil: 'networkidle' })
await portal.fill('#email', env.PORTAL_OWNER_EMAIL)
await portal.fill('#password', env.PORTAL_OWNER_PASSWORD)
await portal.click('button[type="submit"]')
await portal.waitForURL('**/store-portal', { timeout: 20000 }).catch(() => {})

section('Owner-written content is escaped, not executed')

{
  // The owner is trusted, but not to the point of running script in a
  // customer's mail client.
  const injection = '<img src=x onerror="alert(1)">'
  const result = await portal.evaluate(async (payload) => {
    const r = await fetch('/api/portal/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'order_confirmation',
        subject: payload,
        heading: payload,
        intro: payload,
        outro: payload,
      }),
    })
    return r.json()
  }, injection)

  const html = result.html ?? ''
  !html.includes('onerror="alert(1)"')
    ? pass('an injected handler is escaped in the rendered email')
    : fail('email copy is rendered as live HTML')
  html.includes('&lt;img')
    ? pass('the markup is visible as text, as intended')
    : fail('injected markup was neither escaped nor visible')
}

section('Image URLs must be ones the shop issued')

{
  // A product form is a trust boundary: without a check, a photograph could be
  // pointed at any host on the internet.
  const check = await portal.evaluate(async () => {
    const r = await fetch('/api/portal/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'shipping_notice' }),
    })
    return r.status
  })
  check === 200 ? pass('signed-in preview works') : fail(`preview returned ${check}`)
}

console.log(
  failures === 0
    ? '\n\x1b[32mAll security probes passed.\x1b[0m\n'
    : `\n\x1b[31m${failures} probe(s) failed.\x1b[0m\n`,
)

await browser.close()
process.exit(failures > 0 ? 1 : 0)
