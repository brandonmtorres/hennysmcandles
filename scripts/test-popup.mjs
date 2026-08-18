/**
 * The signup popup, behaving as intended: it waits, it respects an answer, it
 * keeps out of the way of the footer form, and it says what the portal says.
 */
import { chromium } from 'playwright-core'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const EXECUTABLE = fs
  .readdirSync('/root/.cache/ms-playwright')
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .reverse()
  .map((d) => `/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`)
  .find((p) => fs.existsSync(p))

const BASE = 'http://localhost:3000'
const db = new PrismaClient()
let failures = 0

const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label.padEnd(52)}${detail}`,
  )
}

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] })

const PANEL = '#newsletter-popup-heading'
// The cart drawer is a dialog too and lives in the DOM permanently, so the
// popup has to be addressed by its own label rather than by role alone.
const DIALOG = '[role=dialog][aria-labelledby="newsletter-popup-heading"]'
const shown = (page) => page.locator(PANEL).count().then((n) => n > 0)

/** A fresh visitor: new context, so nothing is remembered from before. */
async function visitor(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('#newsletter-email', { timeout: 20000 })
  return { context, page }
}

const scrollTo = (page, fraction) =>
  page.evaluate((f) => {
    window.scrollTo({ top: document.body.scrollHeight * f, behavior: 'instant' })
  }, fraction)

// --- Settings are what the shop shows --------------------------------------
console.log('\nIt says what the portal says\n')

const TOUCHED = [
  'newsletter_popup_eyebrow',
  'newsletter_popup_heading_lead',
  'newsletter_popup_heading_tail',
  'newsletter_popup_body',
  'newsletter_popup_button',
  'newsletter_discount_percent',
  'newsletter_popup_enabled',
  'newsletter_popup_delay_seconds',
  'newsletter_popup_scroll_percent',
]

const original = await db.setting.findMany({ where: { key: { in: TOUCHED } } })
const restore = new Map(original.map((r) => [r.key, r.value]))

async function setSetting(key, value) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
}

/**
 * Puts the shop's own wording back.
 *
 * Wrapped so it runs even when a check throws part-way. An earlier version only
 * restored on the happy path, and when one assertion crashed it left the test
 * copy live on the shop — after which the next run faithfully recorded that as
 * the settings to preserve.
 */
async function putSettingsBack() {
  for (const key of TOUCHED) {
    const before = restore.get(key)
    if (before === undefined) await db.setting.deleteMany({ where: { key } })
    else await db.setting.upsert({ where: { key }, update: { value: before }, create: { key, value: before } })
  }
}

process.on('exit', () => {
  // A last resort if something escapes the try/finally below.
  if (!restored) console.error('\n  ! settings may not have been restored — check the popup page\n')
})
let restored = false

try {

{
  await setSetting('newsletter_popup_eyebrow', 'Test eyebrow')
  await setSetting('newsletter_popup_heading_lead', 'Have')
  await setSetting('newsletter_popup_heading_tail', 'on the house')
  await setSetting('newsletter_popup_body', 'A body written in the portal.')
  await setSetting('newsletter_popup_button', 'Yes please')
  await setSetting('newsletter_discount_percent', '25')
  await setSetting('newsletter_popup_scroll_percent', '35')
  await setSetting('newsletter_popup_delay_seconds', '18')
  await setSetting('newsletter_popup_enabled', 'true')

  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)

  // Lower-cased before comparing: the eyebrow and the button are upper-cased in
  // CSS, and innerText reports what is painted rather than what was written.
  const text = (await page.locator(PANEL).locator('xpath=..').innerText().catch(() => ''))
    .toLowerCase()
  const says = (phrase) => text.includes(phrase.toLowerCase())

  check('the eyebrow comes from the portal', says('Test eyebrow'))
  check('the heading comes from the portal', says('Have') && says('on the house'))
  check('the discount comes from the portal', says('25% off'), '25%')
  check('the body comes from the portal', says('A body written in the portal.'))
  check('the button comes from the portal', says('Yes please'))
  await context.close()
}

// --- The triggers -----------------------------------------------------------
console.log('\nIt waits its turn\n')

{
  const { context, page } = await visitor()
  await page.waitForTimeout(1500)
  check('it is absent on arrival', !(await shown(page)))
  await scrollTo(page, 0.1)
  await page.waitForTimeout(900)
  check('it stays away near the top of the page', !(await shown(page)))
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)
  check('it arrives once the reader is halfway down', await shown(page))
  await context.close()
}

{
  // The trigger must wait for the scrolling to stop, or it opens over the very
  // form the visitor is travelling towards.
  const { context, page } = await visitor()
  await page.fill('#newsletter-email', 'reaching-the-footer@example.com')
  await page.waitForTimeout(2200)
  check('it does not ambush the footer signup', !(await shown(page)))
  await context.close()
}

{
  await setSetting('newsletter_popup_delay_seconds', '2')
  await setSetting('newsletter_popup_scroll_percent', '0')
  const { context, page } = await visitor()
  check('with scrolling off it is not there at once', !(await shown(page)))
  await page.waitForTimeout(3000)
  check('the delay alone brings it up', await shown(page), 'after 2s')
  await context.close()
  await setSetting('newsletter_popup_delay_seconds', '18')
  await setSetting('newsletter_popup_scroll_percent', '35')
}

// --- It takes an answer -----------------------------------------------------
console.log('\nIt takes an answer\n')

{
  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)
  await page.click('button:has-text("No thanks")')
  await page.waitForTimeout(400)
  check('“No thanks” closes it', !(await shown(page)))

  const until = await page.evaluate(() =>
    Number(localStorage.getItem('hm_newsletter_dismissed_until') ?? 0),
  )
  const days = (until - Date.now()) / 86_400_000
  check('and it is remembered for a fortnight', days > 13 && days < 15, `${days.toFixed(1)} days`)

  await page.reload({ waitUntil: 'load' })
  await scrollTo(page, 0.6)
  await page.waitForTimeout(1500)
  check('so it does not return on the next page view', !(await shown(page)))
  await context.close()
}

{
  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('Escape closes it', !(await shown(page)))
  await context.close()
}

{
  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)
  // Clicking the backdrop, away from the panel, is a dismissal too.
  await page.mouse.click(30, 30)
  await page.waitForTimeout(300)
  check('clicking outside closes it', !(await shown(page)))
  await context.close()
}

// --- Joining ----------------------------------------------------------------
console.log('\nJoining\n')

const JOINER = `popup-join-${Date.now()}@example.com`
{
  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)
  await page.fill('#popup-email', JOINER)
  await page.click('button:has-text("Yes please")')
  await page.waitForTimeout(1600)

  const row = await db.newsletterSubscriber.findUnique({ where: { email: JOINER } })
  check('the address reaches the mailing list', row?.status === 'SUBSCRIBED')
  check('and is recorded as coming from the popup', row?.source === 'popup', row?.source ?? '')

  const text = await page.locator(PANEL).innerText().catch(() => '')
  check('it confirms rather than just vanishing', text.length > 0, text.slice(0, 40))
  check(
    'joining is remembered',
    (await page.evaluate(() => localStorage.getItem('hm_newsletter_joined'))) === '1',
  )

  await page.reload({ waitUntil: 'load' })
  await scrollTo(page, 0.6)
  await page.waitForTimeout(1500)
  check('a subscriber is never asked again', !(await shown(page)))
  await context.close()
}

// --- Where it must not appear ----------------------------------------------
console.log('\nWhere it keeps out\n')

for (const [path, label] of [
  ['/checkout', 'the checkout'],
  ['/store-portal/login', 'the portal'],
]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto(BASE + path, { waitUntil: 'load' })
  await scrollTo(page, 0.9)
  await page.waitForTimeout(1500)
  check(`it stays off ${label}`, !(await shown(page)))
  await context.close()
}

{
  await setSetting('newsletter_popup_enabled', 'false')
  const { context, page } = await visitor()
  await scrollTo(page, 0.6)
  await page.waitForTimeout(1600)
  check('switching it off in the portal hides it', !(await shown(page)))
  await context.close()
  await setSetting('newsletter_popup_enabled', 'true')
}

// --- Accessibility ----------------------------------------------------------
console.log('\nUsable by keyboard\n')

{
  const { context, page } = await visitor()
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1400)

  check(
    'it is announced as a dialog',
    (await page.locator(`${DIALOG}[aria-modal=true]`).count()) > 0,
  )
  check(
    'focus lands in the email field',
    (await page.evaluate(() => document.activeElement?.id)) === 'popup-email',
    await page.evaluate(() => document.activeElement?.id ?? 'none'),
  )

  // Tabbing must cycle inside the panel rather than escaping to the page.
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab')
  const inside = await page.evaluate(() => {
    const panel = document.querySelector(
      '[role=dialog][aria-labelledby="newsletter-popup-heading"]',
    )
    return Boolean(panel && document.activeElement && panel.contains(document.activeElement))
  })
  check('focus stays inside while it is open', inside)
  await context.close()
}

// --- Mobile -----------------------------------------------------------------
console.log('\nOn a phone\n')

{
  const { context, page } = await visitor({ width: 390, height: 844 })
  await scrollTo(page, 0.5)
  await page.waitForTimeout(1500)
  check('it appears on a small screen', await shown(page))

  const box = await page.locator(DIALOG).boundingBox()
  check(
    'it fits the screen without overflowing',
    Boolean(box) && box.x >= 0 && box.x + box.width <= 390.5,
    box ? `${Math.round(box.width)}px wide` : 'no panel',
  )
  const tall = Boolean(box) && box.height <= 844
  check('it does not run off the bottom', tall, box ? `${Math.round(box.height)}px tall` : '')
  await page.screenshot({ path: 'docs/shots/newsletter-popup-mobile.png' })
  await context.close()
}

} finally {
  // --- Put everything back --------------------------------------------------
  await putSettingsBack()
  restored = true

  await db.newsletterEvent.deleteMany({ where: { email: { startsWith: 'popup-join-' } } })
  await db.newsletterSubscriber.deleteMany({ where: { email: { startsWith: 'popup-join-' } } })
}

console.log(
  failures === 0
    ? '\n\x1b[32mThe popup behaves.\x1b[0m\n'
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1

await browser.close()
await db.$disconnect()
