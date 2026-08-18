import 'server-only'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Where product photography is kept.
 *
 * Two backends, chosen by configuration rather than by a flag anyone has to
 * remember:
 *
 *   · **Object storage** when an S3-compatible bucket is configured. This is
 *     the production path. It is deliberately S3-*compatible* rather than one
 *     vendor's SDK, so the same code works on Cloudflare R2, Amazon S3,
 *     DigitalOcean Spaces, Backblaze or Supabase Storage — the choice of host
 *     stays the owner's, and does not need a code change.
 *
 *   · **The local `public/uploads` directory** otherwise, which is what makes
 *     `npm run dev` work with no accounts at all.
 *
 * The reason this exists: a serverless deployment has no durable disk. Files
 * written to `public/uploads` there survive until the next deploy and then
 * vanish, taking the entire catalogue's photography with them — and nothing
 * announces it, because the upload appears to succeed at the time.
 */

export type StoredImage = { url: string }

/** Reads the variable at run time so a build made before it existed still sees it. */
function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export type StorageConfig = {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Set for anything that is not Amazon S3 itself. */
  endpoint?: string
  /** Where the bucket is served from publicly — a CDN domain, usually. */
  publicUrl: string
}

export function storageConfig(): StorageConfig | null {
  const bucket = env('S3_BUCKET')
  const accessKeyId = env('S3_ACCESS_KEY_ID')
  const secretAccessKey = env('S3_SECRET_ACCESS_KEY')
  const publicUrl = env('S3_PUBLIC_URL')

  // All four or none. A half-configured bucket that silently falls back to
  // local disk is the failure this whole module exists to prevent.
  if (!bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl: publicUrl.replace(/\/+$/, ''),
    region: env('S3_REGION') ?? 'auto',
    endpoint: env('S3_ENDPOINT'),
  }
}

/** True when uploads go somewhere that survives a deploy. */
export function isDurableStorageConfigured(): boolean {
  return storageConfig() !== null
}

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads')

/**
 * Whether a URL is one this shop issued for an image.
 *
 * The portal stores whatever URL a form hands it, so this is a trust boundary:
 * without it, someone who reached a product form could point a candle's
 * photograph at any address on the internet and have the shop render it.
 *
 * Accepted: the site's own `/uploads/` and `/images/` paths, and — when a
 * bucket is configured — that bucket's own public prefix and nothing else.
 */
export function isAllowedImageUrl(url: string): boolean {
  const value = url.trim()
  if (value.includes('..')) return false

  if (value.startsWith('/uploads/') || value.startsWith('/images/')) return true

  const config = storageConfig()
  if (config && value.startsWith(`${config.publicUrl}/uploads/`)) return true

  return false
}

/** A generated name. The client's filename is never trusted or reused. */
export function imageFilename(extension: string): string {
  return `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${extension}`
}

export async function putImage(
  bytes: Buffer,
  extension: string,
  contentType: string,
): Promise<StoredImage> {
  const filename = imageFilename(extension)
  const config = storageConfig()

  if (config) {
    // Imported lazily so the SDK is never loaded — or bundled into a cold
    // start — on a deployment that keeps its images on disk.
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: `uploads/${filename}`,
        Body: bytes,
        ContentType: contentType,
        // A year, immutable: the filename is random and a stored image is
        // never rewritten in place, so it can be cached as hard as possible.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )

    return { url: `${config.publicUrl}/uploads/${filename}` }
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true })
  const destination = path.join(LOCAL_DIR, filename)

  // Belt and braces: confirm the resolved path is still inside the upload
  // directory before anything is written.
  if (path.dirname(path.resolve(destination)) !== path.resolve(LOCAL_DIR)) {
    throw new Error('Rejected destination path.')
  }

  await fs.writeFile(destination, bytes)
  return { url: `/uploads/${filename}` }
}
