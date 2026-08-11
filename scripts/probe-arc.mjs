/**
 * Samples the page's ground colour down the whole scroll, to check the
 * dusk-to-dawn arc reads as one continuous change rather than hard-edged
 * blocks. Prints the measured luminance as a bar per sample.
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

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const height = await page.evaluate(() => document.body.scrollHeight)
const SAMPLES = 48
const step = (height - 900) / (SAMPLES - 1)

console.log('\nGround luminance down the page (◼ = night, ◻ = dawn)\n')

let previous = null
let maxJump = 0
const rows = []

for (let i = 0; i < SAMPLES; i += 1) {
  const y = Math.round(i * step)
  await page.evaluate((v) => window.scrollTo(0, v), y)
  await page.waitForTimeout(190)

  // Sample a strip on the left margin, clear of imagery and text.
  const shot = await page.screenshot({ clip: { x: 8, y: 430, width: 26, height: 26 } })
  const { PNG } = await import('pngjs').catch(() => ({ PNG: null }))

  // Decode without a PNG library: let the browser do it.
  const lum = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let r = 0
    let g = 0
    let bl = 0
    const n = d.length / 4
    for (let k = 0; k < d.length; k += 4) {
      r += d[k]
      g += d[k + 1]
      bl += d[k + 2]
    }
    r /= n
    g /= n
    bl /= n
    return {
      lum: (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255,
      rgb: [Math.round(r), Math.round(g), Math.round(bl)],
    }
  }, shot.toString('base64'))

  const dawn = await page.evaluate(() =>
    Number(
      getComputedStyle(document.documentElement).getPropertyValue('--dawn') || 0,
    ),
  )

  if (previous !== null) maxJump = Math.max(maxJump, Math.abs(lum.lum - previous))
  previous = lum.lum

  rows.push({ pct: Math.round((y / (height - 900)) * 100), ...lum, dawn })
}

for (const row of rows) {
  const bar = '█'.repeat(Math.max(1, Math.round(row.lum * 46)))
  console.log(
    `  ${String(row.pct).padStart(3)}%  dawn ${row.dawn.toFixed(2)}  ` +
      `rgb(${row.rgb.join(',').padEnd(11)})  ${bar}`,
  )
}

/*
 * "Largest step" is the wrong measure on its own: across a linear ramp it is
 * simply 100% divided by the number of samples that land inside the fade. What
 * actually distinguishes a sunrise from a hard edge is how many samples sit
 * mid-transition — a block boundary produces none, a long fade produces many.
 */
const midway = rows.filter((r) => r.lum > 0.14 && r.lum < 0.86).length
const scrollPerSample = Math.round(step)

console.log(`\n  largest step between adjacent samples: ${(maxJump * 100).toFixed(1)}%`)
console.log(`  samples mid-transition (14–86% luminance): ${midway}`)
console.log(`  sample spacing: ${scrollPerSample}px of scroll`)
console.log(
  midway >= 6
    ? `  \x1b[32m✓ the light changes over ~${midway * scrollPerSample}px of scroll — a gradient, not an edge\x1b[0m\n`
    : '  \x1b[31m✗ the transition is too abrupt\x1b[0m\n',
)
if (midway < 6) process.exitCode = 1

await browser.close()
