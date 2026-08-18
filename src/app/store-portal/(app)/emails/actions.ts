'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, recordAudit } from '@/lib/auth'
import {
  EMAIL_DEFAULTS,
  resetEmailCopy,
  saveEmailCopy,
  type EmailTemplateKey,
} from '@/lib/email/copy'
import { sampleOrder } from '@/lib/email/sample'
import { renderOrderConfirmation, renderShippingNotice } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/send'
import { getSettings } from '@/lib/settings'

export type EmailState = { error?: string; message?: string }

const KEYS: EmailTemplateKey[] = ['order_confirmation', 'shipping_notice']

function readKey(formData: FormData): EmailTemplateKey | null {
  const key = String(formData.get('key') ?? '')
  return KEYS.includes(key as EmailTemplateKey) ? (key as EmailTemplateKey) : null
}

export async function saveEmailTemplate(
  _previous: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const user = await requireUser()

  const key = readKey(formData)
  if (!key) return { error: 'That email does not exist.' }

  const text = (field: string, max: number) =>
    String(formData.get(field) ?? '')
      .trim()
      .slice(0, max)

  const subject = text('subject', 200)
  const heading = text('heading', 200)
  const intro = text('intro', 4000)
  const outro = text('outro', 2000)

  if (!subject) return { error: 'An email needs a subject line.' }
  if (!heading) return { error: 'An email needs a heading.' }
  if (!intro) return { error: 'Write at least an opening paragraph.' }

  await saveEmailCopy(key, { subject, heading, intro, outro })
  await recordAudit({ user, action: 'email.update', entity: 'email', entityId: key })

  revalidatePath('/store-portal/emails')
  return { message: 'Saved. This is what customers will receive from now on.' }
}

export async function resetEmailTemplate(
  _previous: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const user = await requireUser()

  const key = readKey(formData)
  if (!key) return { error: 'That email does not exist.' }

  await resetEmailCopy(key)
  await recordAudit({ user, action: 'email.reset', entity: 'email', entityId: key })

  revalidatePath('/store-portal/emails')
  return { message: 'Put back to the wording it came with.' }
}

/**
 * Sends the email to whoever is signed in, using the wording currently in the
 * form rather than what was last saved — so it can be read in a real inbox
 * before being committed to.
 */
export async function sendTestEmail(
  _previous: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const user = await requireUser()

  const key = readKey(formData)
  if (!key) return { error: 'That email does not exist.' }

  const copy = {
    subject: String(formData.get('subject') ?? '').slice(0, 200),
    heading: String(formData.get('heading') ?? '').slice(0, 200),
    intro: String(formData.get('intro') ?? '').slice(0, 4000),
    outro: String(formData.get('outro') ?? '').slice(0, 2000),
  }
  const filled = {
    subject: copy.subject.trim() || EMAIL_DEFAULTS[key].subject,
    heading: copy.heading.trim() || EMAIL_DEFAULTS[key].heading,
    intro: copy.intro.trim() || EMAIL_DEFAULTS[key].intro,
    outro: copy.outro,
  }

  const settings = await getSettings()
  const rendered =
    key === 'order_confirmation'
      ? renderOrderConfirmation(sampleOrder(), filled, settings.storeName)
      : renderShippingNotice(sampleOrder(), filled, settings.storeName)

  const result = await sendEmail({
    to: user.email,
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
  })

  if (!result.ok) return { error: `It could not be sent: ${result.error}` }

  return {
    message:
      result.mode === 'preview'
        ? `No email provider is configured, so it was written to .mail-preview/ instead of being sent. Set RESEND_API_KEY to send for real.`
        : `Sent to ${user.email}.`,
  }
}
