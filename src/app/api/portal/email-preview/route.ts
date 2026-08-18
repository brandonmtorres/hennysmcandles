import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { EMAIL_DEFAULTS, type EmailTemplateKey } from '@/lib/email/copy'
import { sampleOrder } from '@/lib/email/sample'
import { renderOrderConfirmation, renderShippingNotice } from '@/lib/email/templates'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Renders an email for the portal's preview pane.
 *
 * It takes the wording from the request rather than the database, so the owner
 * sees what they are typing before they commit to it — and sees it through the
 * same renderer that sends the real thing, which is the only way a preview is
 * worth trusting.
 *
 * Behind the session guard: it is not secret, but it is not public either, and
 * an unauthenticated HTML-rendering endpoint is a needless invitation.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const input = body as Partial<Record<string, string>>
  const key = input.key as EmailTemplateKey
  if (key !== 'order_confirmation' && key !== 'shipping_notice') {
    return NextResponse.json({ error: 'Unknown email.' }, { status: 400 })
  }

  const defaults = EMAIL_DEFAULTS[key]
  const copy = {
    subject: (input.subject ?? '').trim() || defaults.subject,
    heading: (input.heading ?? '').trim() || defaults.heading,
    intro: (input.intro ?? '').trim() || defaults.intro,
    outro: input.outro ?? '',
  }

  const settings = await getSettings()
  const rendered =
    key === 'order_confirmation'
      ? renderOrderConfirmation(sampleOrder(), copy, settings.storeName)
      : renderShippingNotice(sampleOrder(), copy, settings.storeName)

  return NextResponse.json({ subject: rendered.subject, html: rendered.html })
}
