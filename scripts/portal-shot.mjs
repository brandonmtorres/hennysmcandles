/**
 * Signs into the portal and screenshots the requested pages.
 *   node scripts/portal-shot.mjs <path> <name> [viewport]
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

const [, , path = '/store-portal', name = 'portal', viewport = 'desktop'] = process.argv

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

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

fs.mkdirSync('/tmp/shots', { recursive: true })

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({
  viewport: SIZES[viewport] ?? SIZES.desktop,
  deviceScaleFactor: 2,
})

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('unsafe-eval')) errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:3000/store-portal/login', { waitUntil: 'networkidle' })
await page.fill('#email', env.PORTAL_OWNER_EMAIL)
await page.fill('#password', env.PORTAL_OWNER_PASSWORD)
await page.click('button[type=submit]')
// Wait until we have actually left the login screen — a glob on /store-portal
// would match the login URL itself and race ahead of the session cookie.
await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 })

await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const file = `/tmp/shots/${name}.png`
await page.screenshot({ path: file, fullPage: true })
console.log(file)
console.log('URL:', page.url())
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 8).join('\n'))

await browser.close()
