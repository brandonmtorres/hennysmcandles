import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsletterSchema } from '@/lib/validation'
import { clientIpFrom } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A small in-memory throttle. Enough to stop casual form spam; swap for a
// shared store if the app is ever deployed to more than one instance.
const recent = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function throttled(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > MAX_PER_WINDOW
}

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers)
  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' },
      { status: 400 },
    )
  }

  try {
    await db.newsletterSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email, source: 'footer' },
    })
  } catch (error) {
    console.error('[newsletter] Could not save subscriber:', error)
    return NextResponse.json(
      { error: 'We could not save that just now. Please try again.' },
      { status: 500 },
    )
  }

  // The same response either way — whether an address is already subscribed
  // is not something a stranger should be able to probe.
  return NextResponse.json({ message: 'You are on the list.' })
}
