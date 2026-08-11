/**
 * Screenshot helper used during design iteration.
 *   node scripts/shoot.mjs <url-path> <out-name> [viewport] [fullPage] [scrollTo]
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

const [, , path = '/', name = 'shot', viewport = 'desktop', fullPage = 'false', scrollTo = '0'] =
  process.argv

const SIZES = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
}

const outDir = '/tmp/shots'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
})
const page = await browser.newPage({
  viewport: SIZES[viewport] ?? SIZES.desktop,
  deviceScaleFactor: 2,
})

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`http://localhost:3000${path}`, {
  waitUntil: 'networkidle',
  timeout: 60000,
})

// Scroll the whole page so every IntersectionObserver reveal fires, otherwise
// a full-page capture records sections that are still at opacity 0.
if (fullPage === 'true') {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.75
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 130))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1400)
}

if (Number(scrollTo) > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), Number(scrollTo))
  await page.waitForTimeout(1400)
}

// Let reveal animations settle.
await page.waitForTimeout(1200)

const file = `${outDir}/${name}.png`
await page.screenshot({ path: file, fullPage: fullPage === 'true' })
console.log(file)
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 10).join('\n'))

await browser.close()
