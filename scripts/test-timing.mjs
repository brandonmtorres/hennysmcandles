/**
 * Verifies the sign-in endpoint does not leak account existence through
 * response timing. An unknown email must cost the same as a known one.
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

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()

async function timeLogin(email) {
  await page.goto('http://localhost:3000/store-portal/login', {
    waitUntil: 'networkidle',
  })
  await page.fill('#email', email)
  await page.fill('#password', 'DefinitelyTheWrongPassword123')
  const started = Date.now()
  await page.click('button[type=submit]')
  await page.waitForSelector('[role=alert]', { timeout: 25000 })
  return Date.now() - started
}

// Warm the route so compilation time does not pollute the samples.
await timeLogin('warmup@example.com')
await timeLogin('warmup2@example.com')

const known = []
const unknown = []
for (let i = 0; i < 5; i += 1) {
  known.push(await timeLogin(env.PORTAL_OWNER_EMAIL))
  unknown.push(await timeLogin(`nobody${i}@example.com`))
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
const k = median(known)
const u = median(unknown)
const delta = Math.abs(k - u)
const pct = (delta / Math.max(k, u)) * 100

console.log(`  existing account     : ${k}ms  [${known.join(', ')}]`)
console.log(`  non-existent account : ${u}ms  [${unknown.join(', ')}]`)
console.log(`  difference           : ${delta}ms (${pct.toFixed(1)}%)`)
console.log(
  pct < 30
    ? '  \x1b[32m✓ no usable timing oracle — accounts are not enumerable\x1b[0m'
    : '  \x1b[31m✗ timing leak: valid accounts are distinguishable\x1b[0m',
)
if (pct >= 30) process.exitCode = 1

await browser.close()
