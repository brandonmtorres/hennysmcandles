/**
 * Reproduces the reported "elements don't populate the screen" bug.
 *
 * Measures how many `.reveal` elements are actually visible after a
 * client-side navigation, compared to a full page load of the same route.
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
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const countReveals = () =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll('.reveal')]
    const inView = all.filter((el) => {
      const r = el.getBoundingClientRect()
      return r.top < window.innerHeight && r.bottom > 0
    })
    const visible = inView.filter((el) => Number(getComputedStyle(el).opacity) > 0.5)
    return { total: all.length, inView: inView.length, visible: visible.length }
  })

console.log('\nReveal behaviour: hard load vs client-side navigation\n')

for (const route of ['/products', '/about', '/ritual']) {
  // Baseline: load the route directly.
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.reveal', { timeout: 30000 })
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForTimeout(1600)
  const direct = await countReveals()

  // Then reach the same route by clicking through from the home page.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.reveal', { timeout: 30000 })
  await page.waitForTimeout(1200)
  await page.evaluate((r) => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => new URL(a.href).pathname === r,
    )
    link?.click()
  }, route)
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.waitForTimeout(2200)
  const navigated = await countReveals()

  const ok = navigated.visible >= navigated.inView && direct.visible >= direct.inView
  console.log(
    `  ${route}\n` +
      `    hard load  : ${direct.visible}/${direct.inView} in-view reveals visible\n` +
      `    navigated  : ${navigated.visible}/${navigated.inView} in-view reveals visible  ${
        ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗ CONTENT STAYS HIDDEN\x1b[0m'
      }`,
  )
}

await browser.close()
console.log()
