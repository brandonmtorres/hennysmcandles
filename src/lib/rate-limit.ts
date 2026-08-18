import { db } from '@/lib/db'

/**
 * Login throttling, backed by the database so it survives restarts and works
 * across processes. Two independent buckets are checked: one per IP address
 * (blocks a single attacker) and one per email (blocks a distributed attempt
 * against one account).
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 10
const MAX_PER_EMAIL = 5

/**
 * When no address can be believed (see `clientIpFrom`) every attempt lands in
 * one bucket, so a ceiling of ten would lock the owner out on someone else's
 * behalf. This higher figure is a backstop against a broad spraying attempt
 * rather than a per-visitor limit — the per-email bucket is what actually
 * protects any individual account, and it does not depend on the address.
 */
const MAX_SHARED = 200

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

async function countRecent(identifier: string): Promise<number> {
  return db.loginAttempt.count({
    where: {
      identifier,
      successful: false,
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
  })
}

export async function checkLoginRateLimit(
  ip: string,
  email: string,
): Promise<RateLimitResult> {
  const [ipCount, emailCount] = await Promise.all([
    countRecent(`ip:${ip}`),
    countRecent(`email:${email.toLowerCase()}`),
  ])

  const ipCeiling = isClientIpTrusted ? MAX_PER_IP : MAX_SHARED
  const blocked = ipCount >= ipCeiling || emailCount >= MAX_PER_EMAIL
  return {
    allowed: !blocked,
    retryAfterSeconds: blocked ? Math.ceil(WINDOW_MS / 1000) : 0,
  }
}

export async function recordLoginAttempt(
  ip: string,
  email: string,
  successful: boolean,
): Promise<void> {
  await db.loginAttempt.createMany({
    data: [
      { identifier: `ip:${ip}`, successful },
      { identifier: `email:${email.toLowerCase()}`, successful },
    ],
  })

  // A successful login clears that account's failure budget.
  if (successful) {
    await db.loginAttempt.deleteMany({
      where: { identifier: `email:${email.toLowerCase()}`, successful: false },
    })
  }

  // Opportunistic pruning keeps the table from growing without bound.
  if (Math.random() < 0.05) {
    await db.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    })
  }
}

/**
 * The client IP — but only when something trustworthy vouched for it.
 *
 * Every address here arrives in a header, and headers are written by whoever is
 * calling. `x-forwarded-for` in particular is a list each proxy appends to, so
 * its leftmost entry is simply what the caller claimed. Reading that would hand
 * out a free bypass of every limit built on this function: send a different
 * invented address each time and no per-IP bucket ever fills.
 *
 * So the deployment has to say what it actually runs behind:
 *
 *   CLIENT_IP_HEADER    the single header the proxy in front sets and
 *                       overwrites, e.g. `cf-connecting-ip` on Cloudflare or
 *                       `x-vercel-forwarded-for` on Vercel. Preferred, because
 *                       such a header replaces anything the caller sent.
 *   TRUSTED_PROXY_HOPS  how many proxies of your own are in front. Their
 *                       appended entries sit at the right-hand end of
 *                       x-forwarded-for, so we count back from there.
 *
 * With neither set we are either directly exposed or in development, and no
 * header can be believed. Rather than trust one anyway, every caller collapses
 * into a single shared bucket: limits still apply, they just stop being
 * per-visitor. That is the safe direction to fail, and `isClientIpTrusted` lets
 * a caller add a wider backstop for the shared case.
 */
const CLIENT_IP_HEADER = process.env.CLIENT_IP_HEADER?.trim().toLowerCase() ?? ''
const TRUSTED_PROXY_HOPS = Math.max(
  0,
  Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '0', 10) || 0,
)

/** Whether the address is vouched for, or everyone is sharing one bucket. */
export const isClientIpTrusted = Boolean(CLIENT_IP_HEADER) || TRUSTED_PROXY_HOPS > 0

/** The stand-in used when no address can be believed. */
export const SHARED_IP_BUCKET = 'untrusted'

/**
 * A small in-memory throttle for a public endpoint.
 *
 * Two ceilings, because the address may or may not be worth believing. Behind a
 * proxy we trust, `perVisitor` applies to each caller separately. Otherwise
 * every caller shares one bucket and `shared` applies instead — which has to be
 * far higher, or one busy afternoon would lock out the whole shop. The shared
 * figure is a backstop against a script, not a per-person allowance.
 *
 * State lives in memory, so it resets on restart and is per-instance. That is
 * enough to stop form spam; anything deployed to more than one instance wants a
 * shared store behind the same interface.
 */
export function createThrottle({
  windowMs,
  perVisitor,
  shared,
}: {
  windowMs: number
  perVisitor: number
  shared: number
}): (ip: string) => boolean {
  const seen = new Map<string, number[]>()
  const ceiling = isClientIpTrusted ? perVisitor : shared

  return function throttled(ip: string): boolean {
    const now = Date.now()
    const hits = (seen.get(ip) ?? []).filter((at) => now - at < windowMs)
    hits.push(now)
    seen.set(ip, hits)
    if (seen.size > 5000) seen.clear()
    return hits.length > ceiling
  }
}

export function clientIpFrom(headers: Headers): string {
  if (CLIENT_IP_HEADER) {
    return headers.get(CLIENT_IP_HEADER)?.split(',')[0]?.trim() || SHARED_IP_BUCKET
  }

  if (TRUSTED_PROXY_HOPS > 0) {
    const chain = (headers.get('x-forwarded-for') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    // Our own proxies appended to the right. Anything further left than the
    // hops we actually operate is the caller's to invent, so it is never read.
    if (chain.length >= TRUSTED_PROXY_HOPS) {
      return chain[chain.length - TRUSTED_PROXY_HOPS]!
    }
    return SHARED_IP_BUCKET
  }

  return SHARED_IP_BUCKET
}
