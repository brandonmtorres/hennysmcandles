import 'server-only'

import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

/**
 * Mailing list operations.
 *
 * Every join and leave writes to `NewsletterEvent` as well as updating the
 * subscriber row. The row records who is on the list *now*; the event log
 * records how it got that way, which is the only way to answer "how many did
 * we gain and lose last month" once somebody has left and come back.
 */

export type SubscribeSource = 'footer' | 'popup' | 'checkout' | 'manual' | 'import'

export type SubscribeResult =
  | { ok: true; status: 'new' | 'resubscribed' | 'already'; token: string }
  | { ok: false; reason: string }

export function newToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * Adds someone to the list, or brings them back if they had left.
 *
 * Returning the same shape for "new" and "already subscribed" is deliberate on
 * the public endpoints: whether an address is on the list is not something a
 * stranger should be able to probe by watching responses.
 */
export async function subscribe(
  email: string,
  source: SubscribeSource = 'footer',
  name?: string,
): Promise<SubscribeResult> {
  const address = email.trim().toLowerCase()
  if (!address) return { ok: false, reason: 'Enter an email address.' }

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: address } })

  if (!existing) {
    const token = newToken()
    const created = await db.newsletterSubscriber.create({
      data: {
        email: address,
        name: name?.trim() || null,
        source,
        status: 'SUBSCRIBED',
        unsubscribeToken: token,
      },
    })
    await db.newsletterEvent.create({
      data: { subscriberId: created.id, email: address, type: 'SUBSCRIBED', source },
    })
    return { ok: true, status: 'new', token }
  }

  if (existing.status === 'SUBSCRIBED') {
    return { ok: true, status: 'already', token: existing.unsubscribeToken }
  }

  // They had left. Bring them back and record it as a distinct event so the
  // growth view does not mistake a return for a brand-new signup.
  const token = existing.unsubscribeToken || newToken()
  await db.newsletterSubscriber.update({
    where: { id: existing.id },
    data: {
      status: 'SUBSCRIBED',
      source,
      subscribedAt: new Date(),
      unsubscribedAt: null,
      unsubscribeToken: token,
      ...(name?.trim() ? { name: name.trim() } : {}),
    },
  })
  await db.newsletterEvent.create({
    data: { subscriberId: existing.id, email: address, type: 'RESUBSCRIBED', source },
  })
  return { ok: true, status: 'resubscribed', token }
}

export async function unsubscribeByToken(
  token: string,
): Promise<{ ok: boolean; email?: string }> {
  if (!token) return { ok: false }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
  })
  if (!subscriber) return { ok: false }

  // Already gone? Report success — the person asked to be off the list and
  // they are, and an error here would only be confusing.
  if (subscriber.status === 'UNSUBSCRIBED') {
    return { ok: true, email: subscriber.email }
  }

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  })
  await db.newsletterEvent.create({
    data: {
      subscriberId: subscriber.id,
      email: subscriber.email,
      type: 'UNSUBSCRIBED',
      source: 'link',
    },
  })
  return { ok: true, email: subscriber.email }
}

export async function unsubscribeById(id: string, source = 'portal'): Promise<void> {
  const subscriber = await db.newsletterSubscriber.findUnique({ where: { id } })
  if (!subscriber || subscriber.status === 'UNSUBSCRIBED') return

  await db.newsletterSubscriber.update({
    where: { id },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  })
  await db.newsletterEvent.create({
    data: {
      subscriberId: id,
      email: subscriber.email,
      type: 'UNSUBSCRIBED',
      source,
    },
  })
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export type GrowthDay = {
  date: string
  joined: number
  left: number
  net: number
  total: number
}

/**
 * Daily joins and leaves over a window, with a running list size.
 *
 * The running total is seeded from the net position *before* the window, so
 * the line reflects the real list size rather than starting at zero.
 */
export async function getGrowth(days = 30): Promise<GrowthDay[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const [before, events] = await Promise.all([
    db.newsletterEvent.findMany({
      where: { createdAt: { lt: start } },
      select: { type: true },
    }),
    db.newsletterEvent.findMany({
      where: { createdAt: { gte: start } },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const isJoin = (t: string) => t === 'SUBSCRIBED' || t === 'RESUBSCRIBED'
  const isLeave = (t: string) =>
    t === 'UNSUBSCRIBED' || t === 'BOUNCED' || t === 'DELETED'

  let running = before.reduce(
    (n, e) => n + (isJoin(e.type) ? 1 : isLeave(e.type) ? -1 : 0),
    0,
  )

  const buckets = new Map<string, { joined: number; left: number }>()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    buckets.set(d.toISOString().slice(0, 10), { joined: 0, left: 0 })
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (isJoin(event.type)) bucket.joined += 1
    else if (isLeave(event.type)) bucket.left += 1
  }

  return [...buckets.entries()].map(([date, { joined, left }]) => {
    running += joined - left
    return { date, joined, left, net: joined - left, total: Math.max(0, running) }
  })
}

export type ListStats = {
  subscribed: number
  unsubscribed: number
  joined30: number
  left30: number
  net30: number
  bySource: { source: string; count: number }[]
}

export async function getListStats(): Promise<ListStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [subscribed, unsubscribed, joined30, left30, sources] = await Promise.all([
    db.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
    db.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
    db.newsletterEvent.count({
      where: { createdAt: { gte: since }, type: { in: ['SUBSCRIBED', 'RESUBSCRIBED'] } },
    }),
    db.newsletterEvent.count({
      where: {
        createdAt: { gte: since },
        type: { in: ['UNSUBSCRIBED', 'BOUNCED', 'DELETED'] },
      },
    }),
    db.newsletterSubscriber.groupBy({
      by: ['source'],
      where: { status: 'SUBSCRIBED' },
      _count: true,
    }),
  ])

  return {
    subscribed,
    unsubscribed,
    joined30,
    left30,
    net30: joined30 - left30,
    bySource: sources
      .map((s) => ({ source: s.source, count: s._count }))
      .sort((a, b) => b.count - a.count),
  }
}
