import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsletterSchema } from '@/lib/validation'
import { clientIpFrom, createThrottle } from '@/lib/rate-limit'
import { subscribe, type SubscribeSource } from '@/lib/newsletter'
import { getSettings } from '@/lib/settings'
import { sendEmail } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const throttled = createThrottle({
  windowMs: 60_000,
  perVisitor: 5,
  shared: 60,
})

const SOURCES: SubscribeSource[] = ['footer', 'popup', 'checkout']

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers)
  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' },
      { status: 400 },
    )
  }

  const raw = (body as { source?: unknown }).source
  const source = SOURCES.includes(raw as SubscribeSource)
    ? (raw as SubscribeSource)
    : 'footer'

  let result: Awaited<ReturnType<typeof subscribe>>
  try {
    result = await subscribe(parsed.data.email, source)
  } catch (error) {
    console.error('[newsletter] Could not save subscriber:', error)
    return NextResponse.json(
      { error: 'We could not save that just now. Please try again.' },
      { status: 500 },
    )
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }

  const settings = await getSettings()

  // The welcome goes out once per person, ever. Someone who leaves and returns
  // does not get the discount a second time.
  if (result.status === 'new' || result.status === 'resubscribed') {
    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, welcomedAt: true },
    })

    if (subscriber && !subscriber.welcomedAt) {
      const email = welcomeEmail({
        token: result.token,
        discountPercent: settings.newsletterDiscountPercent,
        discountCode: settings.newsletterWelcomeCode || undefined,
      })
      const sent = await sendEmail({
        to: parsed.data.email,
        subject: email.subject,
        html: email.html,
      })
      if (sent.ok) {
        await db.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: { welcomedAt: new Date() },
        })
      }
    }
  }

  // The same response either way — whether an address is already on the list
  // is not something a stranger should be able to probe.
  return NextResponse.json({
    message: 'You are on the list.',
    discountPercent: settings.newsletterDiscountPercent,
  })
}
