/**
 * Proves an upload actually lands in the bucket.
 *
 * The failure this guards against is quiet: an S3 endpoint that rejects the
 * request, or a public URL that does not serve what was written, both look
 * like a working upload right up until someone opens the shop and finds a
 * broken image. So this puts a real file through the real client and then
 * fetches it back from the URL the portal would have stored.
 *
 * With no bucket configured it checks the local-disk path instead, which is
 * what development uses.
 *
 *   node scripts/test-storage.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

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

// The library reads process.env, not the file.
for (const [key, value] of Object.entries(env)) {
  if (!process.env[key]) process.env[key] = value
}

let failures = 0
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const fail = (m) => {
  failures += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
}

// A one-pixel PNG, with its real magic bytes — the same thing the upload
// endpoint sniffs for.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const configured = Boolean(
  env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_PUBLIC_URL,
)

console.log(
  `\nImage storage — ${configured ? `bucket "${env.S3_BUCKET}"` : 'local disk'}\n`,
)

if (!configured) {
  const { putImage } = await import('../src/lib/storage.ts').catch(() => ({}))
  // The module is TypeScript and server-only; on the local path the check is
  // simply that the directory is writable, which is all the app needs.
  const dir = path.join(process.cwd(), 'public', 'uploads')
  try {
    fs.mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, `.probe-${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
    pass('public/uploads is writable')
  } catch (error) {
    fail(`public/uploads is not writable: ${error.message}`)
  }
  console.log(
    '\n  No bucket is configured. That is correct for development and wrong for\n' +
      '  any host that wipes its filesystem between deploys — set the S3_\n' +
      '  variables and run this again.\n',
  )
  process.exit(failures > 0 ? 1 : 0)
}

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } =
  await import('@aws-sdk/client-s3')

const client = new S3Client({
  region: env.S3_REGION || 'auto',
  ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

// --- The bucket exists and the keys open it ---------------------------------

try {
  await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
  pass('the bucket exists and the credentials open it')
} catch (error) {
  fail(`cannot reach the bucket: ${error.name ?? error.message}`)
  console.log('\n  Nothing else can be checked until that works.\n')
  process.exit(1)
}

// --- A write lands ----------------------------------------------------------

const key = `uploads/probe-${Date.now().toString(36)}.png`

try {
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: PNG,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  pass(`wrote ${key}`)
} catch (error) {
  fail(`the write was rejected: ${error.name}: ${error.message}`)
  process.exit(1)
}

// --- And is readable at the URL the shop would store -------------------------

const publicUrl = `${env.S3_PUBLIC_URL.replace(/\/+$/, '')}/${key}`

try {
  const response = await fetch(publicUrl)
  if (response.ok) {
    const bytes = Buffer.from(await response.arrayBuffer())
    bytes.equals(PNG)
      ? pass('the same bytes come back from S3_PUBLIC_URL')
      : fail(`S3_PUBLIC_URL served ${bytes.length} bytes, expected ${PNG.length}`)

    const cache = response.headers.get('cache-control') ?? ''
    cache.includes('max-age')
      ? pass(`served with cache-control: ${cache}`)
      : console.log('  \x1b[33m·\x1b[0m no cache-control on the response')
  } else {
    fail(
      `S3_PUBLIC_URL returned ${response.status}. The bucket is writable but not\n` +
        `    publicly readable — product images would render as broken links.\n` +
        `    Checked: ${publicUrl}`,
    )
  }
} catch (error) {
  fail(`could not fetch ${publicUrl}: ${error.message}`)
}

// --- Tidy up -----------------------------------------------------------------

try {
  await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  pass('probe object removed')
} catch {
  console.log(`  \x1b[33m·\x1b[0m could not delete the probe object ${key} — remove it by hand`)
}

console.log(
  failures === 0
    ? '\n\x1b[32mUploads land in the bucket and are served back.\x1b[0m\n'
    : `\n\x1b[31m${failures} problem(s) with image storage.\x1b[0m\n`,
)
process.exit(failures > 0 ? 1 : 0)
