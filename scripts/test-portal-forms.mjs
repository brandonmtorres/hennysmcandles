/**
 * Portal form behaviour: slug autofill and the collection picker.
 */
import { chromium } from 'playwright-core'
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const db = new PrismaClient()

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

const BASE = 'http://localhost:3000'
let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label}${detail ? `  → ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.goto(`${BASE}/store-portal/login`, { waitUntil: 'networkidle' })
await page.fill('#email', env.PORTAL_OWNER_EMAIL)
await page.fill('#password', env.PORTAL_OWNER_PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })

// --- Slug autofill ---------------------------------------------------------
console.log('\nSlug autofill\n')

await page.goto(`${BASE}/store-portal/products/new`, { waitUntil: 'networkidle' })

await page.fill('#name', 'Winter Solstice')
await page.waitForTimeout(250)
check('fills from the name', (await page.inputValue('#slug')) === 'winter-solstice', await page.inputValue('#slug'))

await page.fill('#name', 'Mango & Coconut Milk')
await page.waitForTimeout(250)
check(
  'handles punctuation and ampersands',
  (await page.inputValue('#slug')) === 'mango-and-coconut-milk',
  await page.inputValue('#slug'),
)

await page.fill('#name', "Hennys'  Spéciale  Édition!!")
await page.waitForTimeout(250)
check(
  'strips accents and collapses separators',
  (await page.inputValue('#slug')) === 'hennys-speciale-edition',
  await page.inputValue('#slug'),
)

// Once edited by hand, it should stop following the name.
await page.fill('#slug', 'my-own-address')
await page.fill('#name', 'Something Completely Different')
await page.waitForTimeout(250)
check(
  'stops following once set by hand',
  (await page.inputValue('#slug')) === 'my-own-address',
  await page.inputValue('#slug'),
)

// Reset hands control back to the name.
const reset = page.locator('button:has-text("Reset")')
if (await reset.count()) {
  await reset.click()
  await page.waitForTimeout(250)
  check(
    'Reset hands it back to the name',
    (await page.inputValue('#slug')) === 'something-completely-different',
    await page.inputValue('#slug'),
  )
}

// --- Collections -----------------------------------------------------------
console.log('\nCollections\n')

const collectionBoxes = page.locator('input[type=checkbox]')
const hasPicker = (await page.locator('text=Midwinter Edit').count()) > 0
check('the collection picker lists existing collections', hasPicker)

await page.goto(`${BASE}/store-portal/collections`, { waitUntil: 'networkidle' })

// Whichever collections exist, the list must name them.
const anyCollection = await db.collection.findFirst({ select: { id: true, name: true, salePercent: true, saleActive: true } })
check(
  'the collections list names an existing collection',
  anyCollection ? (await page.locator(`text=${anyCollection.name}`).count()) > 0 : false,
  anyCollection?.name ?? 'no collections',
)

// A running promotion has to be visible at a glance. The state is set up here
// rather than assumed, because the seeded promotion is long gone — these are
// the shop's real collections now and the owner edits them.
if (anyCollection) {
  const before = { salePercent: anyCollection.salePercent, saleActive: anyCollection.saleActive }
  await db.collection.update({
    where: { id: anyCollection.id },
    data: { salePercent: 15, saleActive: true },
  })
  try {
    await page.goto(`${BASE}/store-portal/collections`, { waitUntil: 'networkidle' })
    check(
      'a running promotion is visible in the list',
      (await page.locator('text=15% off').count()) > 0,
    )
  } finally {
    await db.collection.update({ where: { id: anyCollection.id }, data: before })
  }
}

// --- Uploader --------------------------------------------------------------
console.log('\nImage uploader\n')

await page.goto(`${BASE}/store-portal/products/new`, { waitUntil: 'networkidle' })
check(
  'the drop zone is present',
  (await page.locator('text=Drag photographs here').count()) > 0,
)
check(
  'a file input remains for keyboard users',
  (await page.locator('input[type=file]').count()) > 0,
)

await page.locator('text=Drag photographs here').scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/shots/uploader.png' })

await browser.close()
console.log(
  failures === 0
    ? '\n\x1b[32mPortal forms behave.\x1b[0m\n'
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1

await db.$disconnect()
