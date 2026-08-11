/**
 * Captures a page at a real viewport size across successive scroll positions.
 * Full-page screenshots resize the viewport, which breaks `position: sticky`
 * and `svh` units — this walks the page the way a visitor actually would.
 *
 *   node scripts/scroll-shots.mjs <path> <prefix> [viewport] [steps]
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

const [, , path = '/', prefix = 'scroll', viewport = 'desktop', steps = '8'] = process.argv

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
}
const size = SIZES[viewport] ?? SIZES.desktop

fs.mkdirSync('/tmp/shots', { recursive: true })

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1.5 })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('unsafe-eval')) errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1600)

const height = await page.evaluate(() => document.body.scrollHeight)
const count = Number(steps)
const stride = Math.max(1, Math.floor((height - size.height) / (count - 1)))

const files = []
for (let i = 0; i < count; i += 1) {
  const y = Math.min(i * stride, height - size.height)
  await page.evaluate((v) => window.scrollTo(0, v), y)
  // Give reveals and warmth transitions time to settle at this position.
  await page.waitForTimeout(1000)
  const file = `/tmp/shots/${prefix}-${String(i).padStart(2, '0')}.png`
  await page.screenshot({ path: file })
  files.push(file)
}

console.log(`page height ${height}px · ${count} frames`)
console.log(files.join('\n'))
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 8).join('\n'))

await browser.close()
