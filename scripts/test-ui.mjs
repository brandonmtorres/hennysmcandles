/**
 * Interaction test for the storefront: navigation, cart, forms, and keyboard
 * access. Complements the webhook test, which covers the server side.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const EXECUTABLE = fs
  .readdirSync('/root/.cache/ms-playwright')
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .reverse()
  .map((d) => `/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`)
  .find((p) => fs.existsSync(p))

const BASE = 'http://localhost:3000'
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
  process.exitCode = 1
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// Whether this environment can actually deliver mail. Several checks below
// have a different correct answer depending on it.
const mailConfigured = Boolean(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('RESEND_API_KEY='))
    ?.split('=')[1]
    ?.replace(/"/g, '')
    .trim(),
)

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('unsafe-eval')) consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

console.log('\nStorefront interaction test\n')

// --- Navigation ------------------------------------------------------------
console.log('Navigation')
await page.goto(BASE, { waitUntil: 'networkidle' })

for (const [label, href] of [
  ['Shop', '/products'],
  ['The Ritual', '/ritual'],
  ['Our Story', '/about'],
  ['Contact', '/contact'],
]) {
  // networkidle, not domcontentloaded: clicking a Next.js Link before React
  // has hydrated swallows the navigation on a production build.
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await Promise.all([
    page.waitForURL(`**${href}`, { timeout: 20000 }).catch(() => {}),
    page.click(`header nav a:has-text("${label}")`),
  ])
  await page.waitForLoadState('domcontentloaded')
  new URL(page.url()).pathname === href
    ? pass(`"${label}" → ${href}`)
    : fail(`"${label}" went to ${new URL(page.url()).pathname}, expected ${href}`)
}

// Every internal link resolves.
await page.goto(BASE, { waitUntil: 'networkidle' })
const hrefs = await page.$$eval('a[href^="/"]', (els) => [
  ...new Set(els.map((e) => e.getAttribute('href'))),
])
let broken = 0
for (const href of hrefs) {
  const res = await page.request.get(BASE + href)
  if (res.status() >= 400) {
    fail(`${href} → ${res.status()}`)
    broken += 1
  }
}
broken === 0 ? pass(`all ${hrefs.length} internal links resolve`) : null

// --- Cart ------------------------------------------------------------------
console.log('\nCart')
// Whichever candle the shop actually lists first, rather than a slug typed
// here — a hidden or renamed one used to break this test for reasons that had
// nothing to do with the cart.
await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' })
const firstCandle = await page
  .locator('article a[href^="/products/"]')
  .first()
  .getAttribute('href')
await page.goto(`${BASE}${firstCandle}`, { waitUntil: 'networkidle' })
const candleName = (await page.locator('h1').first().innerText()).trim()

await page.click('button:has-text("Add to cart")')
await page.waitForTimeout(900)

const drawer = page.locator('[role="dialog"][aria-label="Your cart"]')

// The drawer stays mounted and slides in, so `isVisible()` is true either way.
// Its parent's aria-hidden is the real open/closed signal.
const drawerOpen = () =>
  page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"][aria-label="Your cart"]')
    return panel?.parentElement?.getAttribute('aria-hidden') !== 'true'
  })

;(await drawerOpen()) ? pass('drawer opens after adding') : fail('drawer did not open')

;(await drawer.getByText(candleName, { exact: false }).count()) > 0
  ? pass(`added candle appears in the drawer (${candleName})`)
  : fail(`"${candleName}" missing from drawer`)

const headerCount = await page.locator('header button[aria-label*="Open cart"]').innerText()
headerCount.includes('1') ? pass('header badge shows 1') : fail(`header badge reads "${headerCount}"`)

// Increase quantity and confirm the subtotal follows. The subtotal line is
// read by name rather than by position: the drawer also shows shipping, tax
// and a total, and the last figure in it is no longer the goods alone.
const subtotalLine = drawer.locator('dt:text-is("Subtotal") + dd')
const subtotalBefore = await subtotalLine.innerText()
await drawer.locator('button[aria-label^="Increase quantity"]').first().click()
await page.waitForTimeout(600)
const subtotalAfter = await subtotalLine.innerText()
const toNum = (s) => Number(s.replace(/[^0-9.]/g, ''))
Math.abs(toNum(subtotalAfter) - toNum(subtotalBefore) * 2) < 0.02
  ? pass(`subtotal doubled ${subtotalBefore} → ${subtotalAfter}`)
  : fail(`subtotal went ${subtotalBefore} → ${subtotalAfter}`)

// Persist across a reload.
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const persisted = await page.locator('header button[aria-label*="Open cart"]').innerText()
persisted.includes('2') ? pass('cart survives a reload') : fail(`after reload badge reads "${persisted}"`)

// Remove.
await page.click('header button[aria-label*="Open cart"]')
await page.waitForTimeout(600)
await page.click('button:has-text("Remove")')
await page.waitForTimeout(600)
;(await page.locator('text=Nothing here yet').count()) > 0
  ? pass('removing the last line shows the empty state')
  : fail('empty state did not appear')

// Escape closes.
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
;(await drawerOpen()) ? fail('Escape did not close the drawer') : pass('Escape closes the drawer')

// Nothing inside a closed drawer should be reachable by keyboard.
const reachableWhenClosed = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"][aria-label="Your cart"]')
  if (!panel) return -1
  return [...panel.querySelectorAll('a[href], button')].filter(
    (el) => el.tabIndex >= 0,
  ).length
})
reachableWhenClosed === 0
  ? pass('closed drawer is removed from the tab order')
  : fail(`${reachableWhenClosed} focusable elements inside a closed drawer`)

// --- Sold-out handling -----------------------------------------------------
console.log('\nStock states')
{
  const res = await page.request.post(`${BASE}/api/checkout`, {
    data: { items: [{ productId: 'nope', quantity: 1 }], state: 'OR' },
  })
  res.status() === 400
    ? pass('checkout rejects an unknown product')
    : fail(`checkout returned ${res.status()} for an unknown product`)

  // Whether a destination is required depends on whether the shop charges
  // tax, which is covered properly in test-webhook.mjs where the settings can
  // be controlled. Here it is enough that a junk cart is refused either way.
  const noState = await page.request.post(`${BASE}/api/checkout`, {
    data: { items: [{ productId: 'nope', quantity: 1 }] },
  })
  noState.status() === 400
    ? pass('checkout rejects a junk cart regardless of destination')
    : fail(`checkout returned ${noState.status()} for a junk cart`)
}

// --- Forms -----------------------------------------------------------------
console.log('\nForms')
await page.goto(BASE, { waitUntil: 'networkidle' })
const signupEmail = `test${Date.now()}@example.com`
await page.fill('#newsletter-email', signupEmail)
await page.click('button:has-text("Join")')
await page.waitForTimeout(1500)
;(await page.locator('text=/You are on the list/').count()) > 0
  ? pass('newsletter accepts a valid address')
  : fail('newsletter did not confirm')

await page.goto(`${BASE}/contact`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#message', { timeout: 30000 })
await page.fill('#name', 'Test Person')
await page.fill('#email', 'test@example.com')
await page.fill('#message', 'This is a test message from the automated suite.')
await page.click('button:has-text("Send message")')
await page.waitForTimeout(1800)

// A contact message exists only as an email — there is nowhere else it is
// written down. So with no mail provider configured the form is *supposed* to
// fail loudly rather than thank someone for a message that evaporated. Both
// outcomes are correct; which one is correct depends on the environment.
const contactSent = (await page.locator('text=Message sent').count()) > 0
const contactRefused = (await page.locator('text=/could not send/i').count()) > 0

if (contactSent) {
  pass('contact form submits')
} else if (contactRefused && !mailConfigured) {
  pass('contact form fails honestly while no mail provider is configured')
} else {
  fail('contact form did not confirm')
}

// --- Accessibility ---------------------------------------------------------
console.log('\nAccessibility')
await page.goto(BASE, { waitUntil: 'networkidle' })

await page.keyboard.press('Tab')
const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim())
firstFocus?.includes('Skip to content')
  ? pass('first Tab reaches the skip link')
  : fail(`first Tab focused "${firstFocus}"`)

const outline = await page.evaluate(() => {
  const el = document.activeElement
  const s = getComputedStyle(el)
  return { width: s.outlineWidth, style: s.outlineStyle }
})
outline.style !== 'none' && parseFloat(outline.width) > 0
  ? pass(`focus ring is visible (${outline.width} ${outline.style})`)
  : fail(`focus ring missing: ${JSON.stringify(outline)}`)

const imgsWithoutAlt = await page.$$eval('img', (els) =>
  els.filter((e) => !e.hasAttribute('alt')).length,
)
imgsWithoutAlt === 0
  ? pass('every image has an alt attribute')
  : fail(`${imgsWithoutAlt} images have no alt`)

const h1s = await page.$$eval('h1', (els) => els.length)
h1s === 1 ? pass('exactly one h1') : fail(`${h1s} h1 elements`)

// --- Reduced motion --------------------------------------------------------
console.log('\nReduced motion')
{
  const rm = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  await rm.goto(BASE, { waitUntil: 'networkidle' })
  await rm.waitForTimeout(1200)
  const hidden = await rm.$$eval('.reveal', (els) =>
    els.filter((e) => Number(getComputedStyle(e).opacity) < 0.5).length,
  )
  hidden === 0
    ? pass('all content visible with reduced motion')
    : fail(`${hidden} elements still hidden under reduced motion`)
  await rm.close()
}

// --- No JavaScript ---------------------------------------------------------
console.log('\nJavaScript disabled')
{
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const nojs = await ctx.newPage()
  await nojs.goto(BASE, { waitUntil: 'domcontentloaded' })
  const visible = await nojs.$$eval('.reveal', (els) =>
    els.filter((e) => Number(getComputedStyle(e).opacity) > 0.5).length,
  )
  const total = await nojs.$$eval('.reveal', (els) => els.length)
  visible === total && total > 0
    ? pass(`all ${total} reveal sections render without JS`)
    : fail(`${visible}/${total} reveal sections visible without JS`)
  await ctx.close()
}

// --- Console ---------------------------------------------------------------
console.log('\nConsole')
// A 502 from the contact form is the expected, correct answer when no mail
// provider is configured — it is the form refusing to lose a message. It is
// not a console error worth failing over in that state.
const realErrors = consoleErrors.filter(
  (e) => mailConfigured || !/502|Bad Gateway/i.test(e),
)
realErrors.length === 0
  ? pass('no console errors')
  : fail(`${realErrors.length} console errors:\n     ${realErrors.slice(0, 5).join('\n     ')}`)

console.log(
  process.exitCode ? '\n\x1b[31mSome checks failed.\x1b[0m\n' : '\n\x1b[32mAll checks passed.\x1b[0m\n',
)
await browser.close()

// The signup above is real as far as the app is concerned, and left behind it
// would sit in the owner's mailing list as a stranger they never acquired.
await db.newsletterEvent.deleteMany({ where: { email: signupEmail } })
await db.newsletterSubscriber.deleteMany({ where: { email: signupEmail } })
await db.$disconnect()
