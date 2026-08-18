import { NextResponse } from 'next/server'
import { getSessionUser, recordAudit } from '@/lib/auth'
import { putImage } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Product image upload.
 *
 * File upload is the most attacked surface in an admin, so nothing about the
 * request is trusted:
 *
 *  · The session is checked first — this is never public.
 *  · The declared Content-Type is ignored in favour of the file's own magic
 *    bytes, so renaming `shell.php` to `photo.jpg` does not get it through.
 *  · The client filename is discarded entirely and replaced with a random one,
 *    which removes path traversal, null bytes and unicode tricks in a single
 *    step rather than trying to sanitise them.
 *  · The extension comes from the detected type, not from the upload.
 *  · Size is capped, and the destination is a fixed directory that is resolved
 *    and re-checked before writing.
 */

const MAX_BYTES = 8 * 1024 * 1024
const MAX_FILES = 8

type Detected = { ext: string; mime: string }

/** Identifies a file by its leading bytes. Returns null for anything else. */
function detectImage(bytes: Uint8Array): Detected | null {
  const b = bytes

  // JPEG — FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' }
  }

  // RIFF....WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' }
  }

  // ISO-BMFF 'ftyp' with an AVIF brand
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!)
    if (brand === 'avif' || brand === 'avis') {
      return { ext: 'avif', mime: 'image/avif' }
    }
  }

  return null
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Malformed upload.' }, { status: 400 })
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files were received.' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Up to ${MAX_FILES} images at a time.` },
      { status: 400 },
    )
  }

  const uploaded: { url: string; name: string }[] = []

  for (const file of files) {
    if (file.size === 0) continue
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than 8 MB.` },
        { status: 413 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detected = detectImage(buffer.subarray(0, 16))
    if (!detected) {
      return NextResponse.json(
        { error: `"${file.name}" is not a JPEG, PNG, WebP or AVIF image.` },
        { status: 415 },
      )
    }

    // Where it lands — a bucket in production, local disk in development — is
    // the storage layer's business. The name it is stored under is generated
    // there too, never derived from the upload.
    try {
      const stored = await putImage(buffer, detected.ext, detected.mime)
      uploaded.push({ url: stored.url, name: file.name })
    } catch (error) {
      console.error('[upload] Could not store image:', error)
      return NextResponse.json(
        { error: 'The image could not be saved. Check the storage settings.' },
        { status: 502 },
      )
    }
  }

  if (uploaded.length === 0) {
    return NextResponse.json({ error: 'Nothing was uploaded.' }, { status: 400 })
  }

  await recordAudit({
    user,
    action: 'image.upload',
    meta: { count: uploaded.length, files: uploaded.map((u) => u.url) },
  })

  return NextResponse.json({ files: uploaded })
}
