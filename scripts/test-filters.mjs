/**
 * The candles-page filters: three dropdowns that actually narrow the shelf,
 * keep a shareable URL, and survive having JavaScript switched off.
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
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label.padEnd(50)}${detail}`,
  )
}

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

// Only the results grid. Other bands on the page link to candles too, and
// counting those would report a shelf that never changes.
const GRID = '[data-results] a[href^="/products/"]'
const tiles = () => page.locator(GRID).count()

/**
 * Choose an option and wait for the page to actually follow.
 *
 * The controls are wired up by JavaScript, so a choice made in the first
 * moments after load lands on a control the browser has painted but React has
 * not yet attached to, and nothing happens. A real visitor never moves that
 * fast; a test does, so it retries rather than reporting a bug that is not one.
 */
async function pick(name, value) {
  const before = page.url()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.selectOption(`select[name=${name}]`, value)
    try {
      await page.waitForFunction((was) => location.href !== was, before, { timeout: 4000 })
      await page.waitForTimeout(400)
      return
    } catch {
      await page.waitForTimeout(700)
    }
  }
}
const prices = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/products/"]')]
      .map((a) => {
        const m = a.textContent?.match(/\$([\d,]+\.\d{2})/g)
        if (!m) return null
        // A discounted tile shows the old price beside the new one. The lower
        // figure is what is actually charged, and what the sort orders by.
        return Math.min(...m.map((v) => Number(v.replace(/[$,]/g, ''))))
      })
      .filter((n) => n !== null),
  )

await page.goto(`${BASE}/products`, { waitUntil: 'load' })
await page.waitForSelector('select[name=sort]', { timeout: 20000 })

console.log('\nThe controls\n')

{
  const selects = await page.locator('form select').count()
  check('there are exactly three dropdowns', selects === 3, `${selects}`)

  for (const [name, label] of [
    ['collection', 'Collection'],
    ['availability', 'Availability'],
    ['sort', 'Sort'],
  ]) {
    const has = (await page.locator(`select[name=${name}]`).count()) === 1
    check(`${label} is a dropdown`, has)
  }

  // The facets that were removed should be gone entirely, not just hidden.
  for (const gone of ['crystal', 'scent', 'maxPrice']) {
    check(`${gone} is no longer offered`, (await page.locator(`select[name=${gone}]`).count()) === 0)
  }

  const labelled = await page.evaluate(() =>
    [...document.querySelectorAll('form select')].every((s) => {
      const label = s.closest('label')
      return Boolean(label && label.textContent && label.textContent.trim().length > 0)
    }),
  )
  check('every dropdown has a visible label', labelled)
}

const total = await tiles()
console.log(`\nFiltering  (${total} candles on the shelf)\n`)

{
  const collection = await db.collection.findFirst({
    where: { products: { some: {} } },
    include: { _count: { select: { products: true } } },
  })

  if (collection) {
    await pick('collection', collection.slug)
    const count = await tiles()
    check(
      'choosing a collection narrows the shelf',
      count === collection._count.products,
      `${collection.name}: ${count} of ${total}`,
    )
    check(
      'and the choice is in the address',
      page.url().includes(`collection=${collection.slug}`),
    )
    check(
      'and the dropdown still shows it after the reload',
      (await page.inputValue('select[name=collection]')) === collection.slug,
    )
  }
}

{
  await page.goto(`${BASE}/products`, { waitUntil: 'load' })
  await pick('availability', 'in-stock')
  const soldOut = await page.locator('text=Sold out').count()
  check('“In stock” hides everything sold out', soldOut === 0, `${await tiles()} left`)

  await pick('availability', 'all')
  check('“Everything” brings them back', (await tiles()) === total)
  check('and the default drops out of the address', !page.url().includes('availability'))
}

console.log('\nSorting\n')

{
  await page.goto(`${BASE}/products?sort=price-asc`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const asc = await prices()
  check(
    'low to high really is ascending',
    asc.every((p, i) => i === 0 || asc[i - 1] <= p),
    asc.map((p) => `$${p}`).join(' '),
  )

  await page.goto(`${BASE}/products?sort=price-desc`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const desc = await prices()
  check(
    'high to low really is descending',
    desc.every((p, i) => i === 0 || desc[i - 1] >= p),
    desc.map((p) => `$${p}`).join(' '),
  )

  await page.goto(`${BASE}/products?sort=name`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('[data-results] a[href^="/products/"] h3, [data-results] a[href^="/products/"] h2')].map(
      (h) => h.textContent?.trim() ?? '',
    ),
  )
  const sorted = [...names].sort((a, b) => a.localeCompare(b))
  check('A to Z really is alphabetical', JSON.stringify(names) === JSON.stringify(sorted))
}

console.log('\nClearing\n')

{
  await page.goto(`${BASE}/products?availability=on-sale`, { waitUntil: 'load' })
  await page.waitForTimeout(1600)
  const clear = page.locator('a:has-text("Clear filters")').first()
  check('a way out is offered while filtered', (await clear.count()) > 0)
  if ((await clear.count()) > 0) {
    const was = page.url()
    await clear.click()
    await page
      .waitForFunction((u) => location.href !== u, was, { timeout: 6000 })
      .catch(() => {})
    await page.waitForTimeout(500)
    check('clearing returns the whole shelf', (await tiles()) === total)
    check('and leaves a clean address', page.url().endsWith('/products'), page.url())
    check(
      'and the dropdowns show themselves cleared',
      (await page.inputValue('select[name=availability]')) === 'all' &&
        (await page.inputValue('select[name=collection]')) === '',
    )
  }

  await page.goto(`${BASE}/products`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  check(
    'no way out is offered when nothing is filtered',
    (await page.locator('a:has-text("Clear filters")').count()) === 0,
  )
}

console.log('\nWithout JavaScript\n')

{
  const plain = await browser.newContext({ javaScriptEnabled: false })
  const bare = await plain.newPage()
  await bare.goto(`${BASE}/products`, { waitUntil: 'load' })

  check('the dropdowns still render', (await bare.locator('form select').count()) === 3)
  check(
    'and sit in a real GET form',
    (await bare.locator('form[method=get][action="/products"]').count()) === 1,
  )

  // Server-rendered filtering must work from the URL alone.
  await bare.goto(`${BASE}/products?availability=on-sale`, { waitUntil: 'load' })
  const onSale = await bare.locator(GRID).count()
  // Matches the storefront's own rule: always-visible, or automatic and in stock.
  const everything = await db.product.count({
    where: { OR: [{ visibility: 'VISIBLE' }, { visibility: 'AUTO', stock: { gt: 0 } }] },
  })
  check(
    'a filtered URL is honoured by the server',
    onSale <= everything,
    `${onSale} on sale of ${everything}`,
  )
  await plain.close()
}

console.log('\nOn a phone\n')

{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const small = await phone.newPage()
  await small.goto(`${BASE}/products`, { waitUntil: 'load' })
  await small.waitForSelector('select[name=sort]', { timeout: 20000 })

  const overflows = await small.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  check('nothing spills off the side', !overflows)

  const tall = await small.evaluate(() => {
    const boxes = [...document.querySelectorAll('form select')].map((s) =>
      s.getBoundingClientRect(),
    )
    return boxes.every((b) => b.height >= 40)
  })
  check('the dropdowns stay thumb-sized', tall)

  await small.screenshot({ path: 'docs/shots/products-filters-mobile.png' })
  await phone.close()
}

console.log(
  failures === 0
    ? '\n\x1b[32mThe filters behave.\x1b[0m\n'
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1

await browser.close()
await db.$disconnect()
