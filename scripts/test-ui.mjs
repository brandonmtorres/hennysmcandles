/**
 * Interaction test for the storefront: navigation, cart, forms, and keyboard
 * access. Complements the webhook test, which covers the server side.
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
await page.goto(`${BASE}/products/black-sea-mist`, { waitUntil: 'networkidle' })

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

;(await drawer.locator('text=Black Sea Mist').count()) > 0
  ? pass('added candle appears in the drawer')
  : fail('candle missing from drawer')

const headerCount = await page.locator('header button[aria-label*="Open cart"]').innerText()
headerCount.includes('1') ? pass('header badge shows 1') : fail(`header badge reads "${headerCount}"`)

// Increase quantity and confirm the subtotal follows.
const subtotalBefore = await drawer.locator('text=/^\\$[0-9.,]+$/').last().innerText()
await drawer.locator('button[aria-label^="Increase quantity"]').first().click()
await page.waitForTimeout(600)
const subtotalAfter = await drawer.locator('text=/^\\$[0-9.,]+$/').last().innerText()
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
    data: { items: [{ productId: 'nope', quantity: 1 }] },
  })
  res.status() === 400
    ? pass('checkout rejects an unknown product')
    : fail(`checkout returned ${res.status()} for an unknown product`)
}

// --- Forms -----------------------------------------------------------------
console.log('\nForms')
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.fill('#newsletter-email', `test${Date.now()}@example.com`)
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
;(await page.locator('text=Message sent').count()) > 0
  ? pass('contact form submits')
  : fail('contact form did not confirm')

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
consoleErrors.length === 0
  ? pass('no console errors')
  : fail(`${consoleErrors.length} console errors:\n     ${consoleErrors.slice(0, 5).join('\n     ')}`)

console.log(
  process.exitCode ? '\n\x1b[31mSome checks failed.\x1b[0m\n' : '\n\x1b[32mAll checks passed.\x1b[0m\n',
)
await browser.close()
