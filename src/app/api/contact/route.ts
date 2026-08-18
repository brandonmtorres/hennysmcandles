import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { escapeHtml } from '@/lib/email/templates'
import { emailSchema } from '@/lib/validation'
import { clientIpFrom, createThrottle } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().min(1, 'Add your name.').max(120),
  email: emailSchema,
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5, 'Add a little more detail.').max(4000),
  // Honeypot: must stay empty.
  company: z.string().max(0).optional().default(''),
})

const throttled = createThrottle({
  windowMs: 10 * 60_000,
  perVisitor: 4,
  shared: 40,
})

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers)
  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many messages. Try again a little later.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form.' },
      { status: 400 },
    )
  }

  // A filled honeypot is a bot. Return success so it does not learn otherwise.
  if (parsed.data.company) return NextResponse.json({ ok: true })

  const { name, email, subject, message } = parsed.data
  const settings = await getSettings()
  const to = process.env.OWNER_NOTIFICATION_EMAIL ?? settings.storeEmail

  // Every interpolated value is escaped — the message body is attacker-controlled.
  const html = `
    <h2 style="font-family:Georgia,serif;">New message from the website</h2>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ''}
    <hr>
    <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
  `

  const result = await sendEmail({
    to,
    subject: subject ? `Website: ${subject}` : `Website message from ${name}`,
    html,
    // Replying goes straight back to the customer.
    replyTo: email,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'We could not send that just now. Please try again shortly.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
