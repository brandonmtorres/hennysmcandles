/**
 * Upload endpoint security.
 *
 * File upload is the most attacked surface in an admin, so these check the
 * refusals as carefully as the happy path.
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

const BASE = 'http://localhost:3000'
let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label}${detail ? `  ${detail}` : ''}`)
}

// A genuine 1x1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

console.log('\nUpload endpoint\n')

// --- Unauthenticated -------------------------------------------------------
{
  const ctx = await browser.newContext()
  const res = await ctx.request.post(`${BASE}/api/portal/upload`, {
    multipart: { files: { name: 'x.png', mimeType: 'image/png', buffer: PNG } },
  })
  check('rejects an unauthenticated upload', res.status() === 401, `(${res.status()})`)
  await ctx.close()
}

// --- Signed in -------------------------------------------------------------
const ctx = await browser.newContext()
const page = await ctx.newPage()
await page.goto(`${BASE}/store-portal/login`, { waitUntil: 'networkidle' })
await page.fill('#email', env.PORTAL_OWNER_EMAIL)
await page.fill('#password', env.PORTAL_OWNER_PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })

const post = (multipart) => ctx.request.post(`${BASE}/api/portal/upload`, { multipart })

// A real image goes through.
{
  const res = await post({
    files: { name: 'candle photo.png', mimeType: 'image/png', buffer: PNG },
  })
  const body = await res.json()
  const url = body.files?.[0]?.url ?? ''
  check('accepts a genuine PNG', res.ok() && url.startsWith('/uploads/'), url)
  check(
    'discards the client filename',
    !url.includes('candle') && !url.includes(' '),
    url,
  )
  check('stored on disk', url ? fs.existsSync(`public${url}`) : false)
}

// A script renamed as an image is caught by its bytes.
{
  const res = await post({
    files: {
      name: 'shell.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('<?php system($_GET["c"]); ?>'),
    },
  })
  check('rejects a script disguised as a JPEG', res.status() === 415, `(${res.status()})`)
}

// An SVG — a real image format, but one that can carry script.
{
  const res = await post({
    files: {
      name: 'x.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    },
  })
  check('rejects SVG', res.status() === 415, `(${res.status()})`)
}

// Path traversal in the filename.
{
  const res = await post({
    files: { name: '../../../../etc/passwd.png', mimeType: 'image/png', buffer: PNG },
  })
  const body = await res.json()
  const url = body.files?.[0]?.url ?? ''
  check(
    'a traversal filename cannot escape the upload directory',
    res.ok() && /^\/uploads\/[a-z0-9-]+\.png$/.test(url),
    url,
  )
}

// Oversized.
{
  const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)])
  const res = await post({ files: { name: 'big.png', mimeType: 'image/png', buffer: big } })
  check('rejects a file over 8 MB', res.status() === 413, `(${res.status()})`)
}

// Empty request.
{
  const res = await ctx.request.post(`${BASE}/api/portal/upload`, {
    multipart: { note: 'no files here' },
  })
  check('rejects a request with no files', res.status() === 400, `(${res.status()})`)
}

await browser.close()

console.log(
  failures === 0
    ? '\n\x1b[32mUpload endpoint holds.\x1b[0m\n'
    : `\n\x1b[31m${failures} upload check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1
