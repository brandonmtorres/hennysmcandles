import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Email transport.
 *
 * With RESEND_API_KEY set, mail is delivered through Resend.
 * Without it, the rendered HTML is written to `.mail-preview/` and logged, so
 * the exact email can be inspected during development. Swapping between the
 * two requires no code change anywhere else in the app.
 *
 * To use a different provider, replace only the `deliver` function below.
 */

export type Email = {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export type SendResult =
  | { ok: true; mode: 'sent'; id: string }
  | { ok: true; mode: 'preview'; file: string }
  | { ok: false; error: string }

function previewDir(): string {
  return path.join(process.cwd(), '.mail-preview')
}

async function writePreview(email: Email): Promise<SendResult> {
  try {
    const dir = previewDir()
    await fs.mkdir(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeSubject = email.subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)
    const file = path.join(dir, `${stamp}-${safeSubject}.html`)
    await fs.writeFile(
      file,
      `<!-- To: ${email.to}\n     Subject: ${email.subject} -->\n${email.html}`,
      'utf8',
    )
    console.info(
      `\n[email] RESEND_API_KEY not set — wrote preview instead of sending.\n` +
        `        To:      ${email.to}\n` +
        `        Subject: ${email.subject}\n` +
        `        File:    ${file}\n`,
    )
    return { ok: true, mode: 'preview', file }
  } catch (error) {
    return { ok: false, error: `Could not write email preview: ${String(error)}` }
  }
}

async function deliver(email: Email): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Hennys M. Candles <onboarding@resend.dev>'

  if (!apiKey) {
    // In production there is no such thing as a helpful preview file: the
    // filesystem is usually read-only, nobody is watching the directory, and
    // the customer who just paid is getting silence. Say so plainly in the
    // logs rather than failing quietly into a folder that may not exist.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        `[email] NOT SENT — RESEND_API_KEY is not set. "${email.subject}" for ${email.to} was dropped.`,
      )
      return { ok: false, error: 'No email provider is configured.' }
    }
    return writePreview(email)
  }

  try {
    // Imported lazily so the package is never loaded when it is not configured.
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo ?? process.env.EMAIL_REPLY_TO,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, mode: 'sent', id: data?.id ?? 'unknown' }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Sends an email. Never throws — a failed confirmation email must not roll
 * back a paid order, so callers get a result they can log and move on.
 */
/**
 * Whether mail actually leaves the building.
 *
 * The portal asks this so it can say plainly that nothing is being delivered,
 * rather than letting an owner write and test emails for an hour without
 * realising no customer has ever received one.
 */
export function isEmailSending(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(email: Email): Promise<SendResult> {
  const result = await deliver(email)
  if (!result.ok) console.error('[email] delivery failed:', result.error)
  return result
}
