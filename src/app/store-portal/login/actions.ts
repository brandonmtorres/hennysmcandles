'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { TOTP } from 'otpauth'
import { db } from '@/lib/db'
import {
  createSession,
  decoyPasswordHash,
  destroySession,
  getPendingMfaUserId,
  recordAudit,
  startMfaChallenge,
  verifyPassword,
} from '@/lib/auth'
import { checkLoginRateLimit, clientIpFrom, recordLoginAttempt } from '@/lib/rate-limit'
import { loginSchema, totpSchema } from '@/lib/validation'

export type LoginState = { error?: string; step?: 'password' | 'mfa' }

/**
 * Step one: email and password.
 *
 * The response is deliberately identical whether the email exists or the
 * password is wrong — a differing message would let someone enumerate valid
 * accounts. A dummy hash comparison runs when no user is found so the request
 * takes roughly the same time either way.
 */
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Enter your email address and password.', step: 'password' }
  }

  const { email, password } = parsed.data
  const ip = clientIpFrom(await headers())

  const limit = await checkLoginRateLimit(ip, email)
  if (!limit.allowed) {
    return {
      error: 'Too many failed attempts. Try again in about 15 minutes.',
      step: 'password',
    }
  }

  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    // Verify against a real decoy digest so an unknown address costs the same
    // as a known one. Returning early here would leak account existence.
    await verifyPassword(await decoyPasswordHash(), password)
    await recordLoginAttempt(ip, email, false)
    return { error: 'That email or password is not right.', step: 'password' }
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    await recordLoginAttempt(ip, email, false)
    await recordAudit({ action: 'auth.login_failed', entity: 'user', entityId: user.id })
    return { error: 'That email or password is not right.', step: 'password' }
  }

  await recordLoginAttempt(ip, email, true)

  if (user.totpEnabled && user.totpSecret) {
    await startMfaChallenge(user.id)
    return { step: 'mfa' }
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession(user.id, user.sessionEpoch)
  await recordAudit({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    action: 'auth.login',
  })

  redirect('/store-portal')
}

/** Step two: the six-digit code, only reachable with a valid pending token. */
export async function verifyTotpCode(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = totpSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, step: 'mfa' }
  }

  const userId = await getPendingMfaUserId()
  if (!userId) {
    return { error: 'That took too long. Please sign in again.', step: 'password' }
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user?.totpSecret) {
    return { error: 'Please sign in again.', step: 'password' }
  }

  const ip = clientIpFrom(await headers())
  const limit = await checkLoginRateLimit(ip, user.email)
  if (!limit.allowed) {
    return { error: 'Too many attempts. Try again shortly.', step: 'mfa' }
  }

  const totp = new TOTP({
    issuer: 'Hennys M. Candles',
    label: user.email,
    secret: user.totpSecret,
  })

  // `window: 1` tolerates one 30-second step of clock drift either way.
  const delta = totp.validate({ token: parsed.data.code, window: 1 })
  if (delta === null) {
    await recordLoginAttempt(ip, user.email, false)
    return { error: 'That code is not right. Check your app and try again.', step: 'mfa' }
  }

  await recordLoginAttempt(ip, user.email, true)
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await createSession(user.id, user.sessionEpoch)
  await recordAudit({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    action: 'auth.login_2fa',
  })

  redirect('/store-portal')
}

export async function signOut(): Promise<void> {
  await destroySession()
  redirect('/store-portal/login')
}
