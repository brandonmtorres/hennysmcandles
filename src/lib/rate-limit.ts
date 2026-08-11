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

  const blocked = ipCount >= MAX_PER_IP || emailCount >= MAX_PER_EMAIL
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

/** Best-effort client IP from proxy headers. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
