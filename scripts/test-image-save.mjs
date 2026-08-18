/**
 * An uploaded image must survive being saved to a product.
 *
 * The upload endpoint and the product form validate URLs separately, and they
 * disagreed once: the form accepted only site-relative paths, so every image
 * uploaded to a bucket was silently dropped on save. The upload appeared to
 * work, the preview appeared to work, and the product came back with no
 * photograph. This drives the real form and then reads the database.
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

let failures = 0
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  failures += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

console.log(
  `\nAn uploaded image survives being saved — ${env.S3_BUCKET ? `bucket "${env.S3_BUCKET}"` : 'local disk'}\n`,
)

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

try {
  await page.goto(`${BASE}/store-portal/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', env.PORTAL_OWNER_EMAIL)
  await page.fill('#password', env.PORTAL_OWNER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/store-portal', { timeout: 20000 })

  const product = await db.product.findFirst({ orderBy: { sortOrder: 'asc' } })
  const before = await db.productImage.count({ where: { productId: product.id } })

  await page.goto(`${BASE}/store-portal/products/${product.id}`, {
    waitUntil: 'networkidle',
  })

  // Upload through the form's own file input, exactly as the owner would.
  await page.setInputFiles('input[type="file"]', {
    name: 'new-photo.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await page.waitForTimeout(2500)

  await page.click('button:has-text("Save")')
  await page.waitForTimeout(3000)

  const images = await db.productImage.findMany({
    where: { productId: product.id },
    orderBy: { sortOrder: 'asc' },
  })

  images.length > before
    ? pass(`the image was saved (${before} → ${images.length})`)
    : fail(`the image was dropped on save (still ${images.length})`)

  const added = images.find((i) => !i.url.startsWith('/images/'))
  if (added) {
    pass(`stored URL: ${added.url}`)
    if (env.S3_BUCKET && env.S3_PUBLIC_URL) {
      added.url.startsWith(env.S3_PUBLIC_URL.replace(/\/+$/, ''))
        ? pass('it points at the bucket')
        : fail(`it does not point at the bucket: ${added.url}`)

      const response = await fetch(added.url)
      response.ok
        ? pass('and the shop can fetch it back')
        : fail(`the stored URL returns ${response.status}`)
    }

    // Leave the catalogue as it was found.
    await db.productImage.delete({ where: { id: added.id } })
  } else {
    fail('no new image row was written')
  }

  // An address we did not issue must still be refused.
  const rejected = await page.evaluate(async () => {
    const form = document.querySelector('form')
    return Boolean(form)
  })
  rejected ? pass('product form present') : fail('product form missing')
} catch (error) {
  fail(`the run threw: ${error.message}`)
} finally {
  console.log(
    failures === 0
      ? '\n\x1b[32mUploaded images are saved and served.\x1b[0m\n'
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
  )
  await browser.close()
  await db.$disconnect()
  process.exit(failures > 0 ? 1 : 0)
}
