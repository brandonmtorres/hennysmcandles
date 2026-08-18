/**
 * A sold-out candle stays on the shop.
 *
 * Selling out used to delete a candle from the storefront. This checks the
 * replacement behaviour end to end: the card is still listed and still
 * reachable, it says so plainly, it cannot be bought, and a deliberately
 * hidden candle is still properly gone.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const EXECUTABLE = fs
  .readdirSync('/root/.cache/ms-playwright')
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .reverse()
  .map((d) => `/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`)
  .find((p) => fs.existsSync(p))

const BASE = 'http://localhost:3000'
const db = new PrismaClient()

let failed = 0
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  failed += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
  process.exitCode = 1
}

console.log('\nSold out means sold out, not gone\n')

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

// Pick a real listed candle and remember what to put back.
const candle = await db.product.findFirst({
  where: { visibility: { not: 'HIDDEN' } },
  orderBy: { sortOrder: 'asc' },
})
const restore = { stock: candle.stock, visibility: candle.visibility }

try {
  await db.product.update({ where: { id: candle.id }, data: { stock: 0 } })

  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' })
  const card = page.locator(`a[href="/products/${candle.slug}"]`).first()

  ;(await card.count()) > 0
    ? pass('the sold-out candle is still listed on the shop')
    : fail('the sold-out candle vanished from the collection')

  // The card is an <article>; the footer also links candles, so scope to the grid.
  const listing = page.locator(`article:has(a[href="/products/${candle.slug}"])`).first()
  const listingText = (await listing.count()) > 0 ? await listing.innerText() : ''
  const cardSaysSoldOut = /sold out/i.test(listingText)
  cardSaysSoldOut
    ? pass('its card says sold out')
    : fail(`the card does not say sold out — it reads "${listingText.replace(/\n/g, ' / ')}"`)

  // The product page must still resolve: links already shared or indexed
  // should lead somewhere.
  const response = await page.goto(`${BASE}/products/${candle.slug}`, {
    waitUntil: 'networkidle',
  })
  response.status() === 200
    ? pass('its own page still loads rather than 404ing')
    : fail(`the product page returned ${response.status()}`)

  const body = await page.locator('main, body').first().innerText()
  const pageSaysSoldOut = /sold out/i.test(body)
  pageSaysSoldOut
    ? pass('the page says sold out')
    : fail('the product page does not say sold out')

  const addButton = page.locator('button:has-text("Add to cart")')
  ;(await addButton.count()) === 0
    ? pass('there is no way to add it to a cart')
    : fail('a sold-out candle can still be added to the cart')

  // And the server refuses it even if a stale cart tries.
  const attempt = await page.request.post(`${BASE}/api/checkout`, {
    data: { items: [{ productId: candle.id, quantity: 1 }], state: 'OR' },
  })
  attempt.status() === 409
    ? pass('the server refuses to sell it')
    : fail(`checkout returned ${attempt.status()} for a sold-out candle`)

  // Hidden still means hidden.
  await db.product.update({
    where: { id: candle.id },
    data: { visibility: 'HIDDEN', stock: 5 },
  })
  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' })
  ;(await page.locator(`article:has(a[href="/products/${candle.slug}"])`).count()) === 0
    ? pass('a hidden candle is gone from the grid')
    : fail('a hidden candle is showing in the grid')

  // The footer links candles on every page; a hidden one must not survive there.
  ;(await page.locator(`footer a[href="/products/${candle.slug}"]`).count()) === 0
    ? pass('and gone from the footer links too')
    : fail('a hidden candle is still linked from the footer')
} finally {
  await db.product.update({ where: { id: candle.id }, data: restore })
  console.log(
    failed === 0
      ? '\n\x1b[32mSold-out candles stay on the shelf.\x1b[0m\n'
      : `\n\x1b[31m${failed} check(s) failed.\x1b[0m\n`,
  )
  await browser.close()
  await db.$disconnect()
}
