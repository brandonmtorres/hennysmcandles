'use server'

import { revalidatePath } from 'next/cache'
import { Secret, TOTP } from 'otpauth'
import { db } from '@/lib/db'
import {
  bumpSessionEpoch,
  createSession,
  hashPassword,
  recordAudit,
  requireUser,
  verifyPassword,
} from '@/lib/auth'
import { passwordSchema, totpSchema } from '@/lib/validation'

export type SecurityState = { error?: string; message?: string }

/**
 * Changing a password invalidates every other session by bumping the user's
 * session epoch, then re-issues one for the current browser. Anyone who had
 * stolen a session token is signed out immediately.
 */
export async function changePassword(
  _previous: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const user = await requireUser()

  const current = String(formData.get('currentPassword') ?? '')
  const next = String(formData.get('newPassword') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (next !== confirm) return { error: 'The new passwords do not match.' }

  const parsed = passwordSchema.safeParse(next)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'That password is too weak.' }
  }

  const record = await db.user.findUnique({ where: { id: user.id } })
  if (!record) return { error: 'Please sign in again.' }

  if (!(await verifyPassword(record.passwordHash, current))) {
    await recordAudit({ user, action: 'security.password_change_failed' })
    return { error: 'Your current password is not right.' }
  }

  if (await verifyPassword(record.passwordHash, next)) {
    return { error: 'Choose a password you have not used here before.' }
  }

  const passwordHash = await hashPassword(next)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })

  const epoch = await bumpSessionEpoch(user.id)
  await createSession(user.id, epoch)

  await recordAudit({ user, action: 'security.password_changed' })
  revalidatePath('/store-portal/security')

  return { message: 'Password updated. Any other signed-in device has been logged out.' }
}

/** Generates a secret and returns the pairing URI. Not enabled until confirmed. */
export async function beginTotpSetup(): Promise<{ secret: string; uri: string }> {
  const user = await requireUser()

  const secret = new Secret({ size: 20 })
  const totp = new TOTP({
    issuer: 'Hennys M. Candles',
    label: user.email,
    secret,
  })

  // Stored but not yet active — `totpEnabled` stays false until a code proves
  // the authenticator app was paired correctly.
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret.base32, totpEnabled: false },
  })

  return { secret: secret.base32, uri: totp.toString() }
}

export async function confirmTotp(
  _previous: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const user = await requireUser()

  const parsed = totpSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message }
  }

  const record = await db.user.findUnique({ where: { id: user.id } })
  if (!record?.totpSecret) {
    return { error: 'Start the setup again — no pending secret was found.' }
  }

  const totp = new TOTP({
    issuer: 'Hennys M. Candles',
    label: user.email,
    secret: record.totpSecret,
  })

  if (totp.validate({ token: parsed.data.code, window: 1 }) === null) {
    return { error: 'That code is not right. Check the time on your phone and retry.' }
  }

  await db.user.update({ where: { id: user.id }, data: { totpEnabled: true } })
  await recordAudit({ user, action: 'security.2fa_enabled' })
  revalidatePath('/store-portal/security')

  return { message: 'Two-factor authentication is on.' }
}

export async function disableTotp(
  _previous: SecurityState,
  formData: FormData,
): Promise<SecurityState> {
  const user = await requireUser()

  // Turning 2FA off is a downgrade, so it requires the password.
  const password = String(formData.get('password') ?? '')
  const record = await db.user.findUnique({ where: { id: user.id } })
  if (!record) return { error: 'Please sign in again.' }

  if (!(await verifyPassword(record.passwordHash, password))) {
    return { error: 'That password is not right.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  })
  await recordAudit({ user, action: 'security.2fa_disabled' })
  revalidatePath('/store-portal/security')

  return { message: 'Two-factor authentication is off.' }
}
