import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscribe } from '@/lib/newsletter'
import { clientIpFrom } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const recent = new Map<string, number[]>()

function throttled(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000)
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > 6
}

/**
 * Undoes an unsubscribe, for someone who clicked the link by mistake.
 *
 * The token identifies the person, so no address is accepted from the request —
 * this cannot be used to add anybody to the list who was not already known.
 */
export async function POST(request: Request) {
  if (throttled(clientIpFrom(request.headers))) {
    return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const token = String((body as { token?: unknown }).token ?? '').trim()
  if (!token || token.length > 128) {
    return NextResponse.json({ error: 'That link is not valid.' }, { status: 400 })
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
    select: { email: true },
  })
  if (!subscriber) {
    return NextResponse.json({ error: 'That link is not valid.' }, { status: 404 })
  }

  await subscribe(subscriber.email, 'footer')
  return NextResponse.json({ ok: true })
}
