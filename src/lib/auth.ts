import 'server-only'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import { hash, verify } from '@node-rs/argon2'
import { db } from '@/lib/db'

/**
 * Session handling for the store portal.
 *
 * Sessions are stateless signed JWTs held in an httpOnly cookie. Every read
 * re-checks the user against the database and compares a `sessionEpoch`
 * counter, so changing a password instantly invalidates every session that
 * was issued before it — something a purely stateless token cannot do alone.
 */

const SESSION_COOKIE = 'hm_session'
const MFA_COOKIE = 'hm_mfa_pending'
const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 hours
const MFA_TTL_SECONDS = 60 * 5 // 5 minutes to enter a TOTP code

// Argon2id parameters — OWASP's recommended baseline.
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32',
    )
  }
  return new TextEncoder().encode(secret)
}

export type SessionUser = {
  id: string
  email: string
  name: string | null
  role: string
}

type SessionClaims = {
  uid: string
  epoch: number
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS)
}

/**
 * A real Argon2 digest of a throwaway value, computed once and reused.
 *
 * When a sign-in names an address that does not exist, the login path verifies
 * against this instead of returning early. It must be a genuine hash: a
 * hand-written literal fails to parse and rejects in microseconds, while a
 * real verify costs ~14ms — a difference an attacker can measure to discover
 * which email addresses have portal accounts.
 */
let decoyDigest: Promise<string> | null = null

export function decoyPasswordHash(): Promise<string> {
  if (!decoyDigest) {
    decoyDigest = hash(
      'no-account-with-this-address-exists',
      ARGON2_OPTIONS,
    )
  }
  return decoyDigest
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Token issue / verify
// ---------------------------------------------------------------------------

async function signToken(
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hennysmcandles')
    .setAudience('store-portal')
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey())
}

async function readToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'hennysmcandles',
      audience: 'store-portal',
    })
    return payload as T
  } catch {
    return null
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export async function createSession(userId: string, epoch: number): Promise<void> {
  const token = await signToken({ uid: userId, epoch }, SESSION_TTL_SECONDS)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS))
  jar.delete(MFA_COOKIE)
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(MFA_COOKIE)
}

/** Returns the signed-in user, or null. Safe to call from any server context. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null

  const claims = await readToken<SessionClaims>(token)
  if (!claims?.uid) return null

  const user = await db.user.findUnique({
    where: { id: claims.uid },
    select: { id: true, email: true, name: true, role: true, sessionEpoch: true },
  })
  if (!user) return null

  // Password changed since this token was issued → reject it.
  if (user.sessionEpoch !== claims.epoch) return null

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

/**
 * Guards every portal page and server action. Redirects to the sign-in screen
 * rather than throwing, so an expired session lands somewhere sensible.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/store-portal/login')
  return user
}

// ---------------------------------------------------------------------------
// Two-factor intermediate state
// ---------------------------------------------------------------------------

export async function startMfaChallenge(userId: string): Promise<void> {
  const token = await signToken({ uid: userId, mfa: true }, MFA_TTL_SECONDS)
  const jar = await cookies()
  jar.set(MFA_COOKIE, token, cookieOptions(MFA_TTL_SECONDS))
}

export async function getPendingMfaUserId(): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get(MFA_COOKIE)?.value
  if (!token) return null
  const claims = await readToken<{ uid: string; mfa: boolean }>(token)
  return claims?.mfa ? claims.uid : null
}

/** Invalidates every existing session for a user (used after a password change). */
export async function bumpSessionEpoch(userId: string): Promise<number> {
  const user = await db.user.update({
    where: { id: userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { sessionEpoch: true },
  })
  return user.sessionEpoch
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export async function recordAudit(entry: {
  user?: SessionUser | null
  action: string
  entity?: string
  entityId?: string
  meta?: unknown
}): Promise<void> {
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  await db.auditLog.create({
    data: {
      userId: entry.user?.id ?? null,
      userEmail: entry.user?.email ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      meta: entry.meta === undefined ? null : JSON.stringify(entry.meta),
      ip: forwarded ? forwarded.split(',')[0]!.trim() : (hdrs.get('x-real-ip') ?? null),
    },
  })
}
