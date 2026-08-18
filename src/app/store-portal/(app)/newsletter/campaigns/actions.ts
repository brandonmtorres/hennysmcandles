'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recordAudit, requireUser } from '@/lib/auth'
import { fieldErrors } from '@/lib/validation'
import { sendEmail } from '@/lib/email/send'
import { campaignEmail } from '@/lib/email/templates'

export type CampaignState = {
  errors?: Record<string, string>
  message?: string
  error?: string
}

const campaignSchema = z.object({
  subject: z.string().trim().min(3, 'Give it a subject line.').max(160),
  preheader: z.string().trim().max(160).default(''),
  body: z.string().trim().min(10, 'Write something to send.').max(20_000),
  ctaLabel: z.string().trim().max(60).default(''),
  ctaUrl: z.string().trim().max(300).default(''),
})

export async function saveCampaign(
  campaignId: string | null,
  _previous: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const user = await requireUser()
  const text = (key: string) => String(formData.get(key) ?? '').trim()

  const parsed = campaignSchema.safeParse({
    subject: text('subject'),
    preheader: text('preheader'),
    body: text('body'),
    ctaLabel: text('ctaLabel'),
    ctaUrl: text('ctaUrl'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  // A link in an email must be somewhere real, and only ever http(s).
  const url = parsed.data.ctaUrl
  if (url && !/^https?:\/\//i.test(url)) {
    return { errors: { ctaUrl: 'Start the link with https://' } }
  }

  if (campaignId) {
    const existing = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    })
    // A sent newsletter is a record of what people received; editing it would
    // make that record a lie.
    if (existing?.status === 'SENT') {
      return { error: 'This newsletter has already been sent and cannot be changed.' }
    }
    await db.campaign.update({ where: { id: campaignId }, data: parsed.data })
    await recordAudit({
      user,
      action: 'campaign.update',
      entity: 'campaign',
      entityId: campaignId,
      meta: { subject: parsed.data.subject },
    })
    revalidatePath(`/store-portal/newsletter/campaigns/${campaignId}`)
    return { message: 'Saved.' }
  }

  const created = await db.campaign.create({ data: parsed.data })
  await recordAudit({
    user,
    action: 'campaign.create',
    entity: 'campaign',
    entityId: created.id,
    meta: { subject: parsed.data.subject },
  })
  revalidatePath('/store-portal/newsletter')
  redirect(`/store-portal/newsletter/campaigns/${created.id}`)
}

/** Sends one copy to the signed-in owner, so they can read it before anyone else. */
export async function sendTest(
  campaignId: string,
  _previous: CampaignState,
  _formData: FormData,
): Promise<CampaignState> {
  const user = await requireUser()

  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { error: 'That newsletter no longer exists.' }

  const email = campaignEmail({
    subject: `[Test] ${campaign.subject}`,
    preheader: campaign.preheader,
    body: campaign.body,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl,
    // A placeholder token — the test copy's unsubscribe link is inert.
    token: 'test-preview',
  })

  const result = await sendEmail({ to: user.email, subject: email.subject, html: email.html })
  return result.ok
    ? {
        message:
          result.mode === 'sent'
            ? `Test sent to ${user.email}.`
            : `No email key set, so the test was written to .mail-preview/ instead.`,
      }
    : { error: 'The test could not be sent.' }
}

/**
 * Sends to everybody on the list.
 *
 * Recipients are fetched once and mailed in small batches with a pause between
 * them, because providers rate-limit and a burst gets throttled or bounced.
 * Each person's own unsubscribe token goes into their copy, so the link in the
 * footer works and removes exactly the right address.
 */
export async function sendCampaign(
  campaignId: string,
  _previous: CampaignState,
  _formData: FormData,
): Promise<CampaignState> {
  const user = await requireUser()

  const campaign = await db.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { error: 'That newsletter no longer exists.' }
  if (campaign.status === 'SENT') return { error: 'This one has already been sent.' }
  if (campaign.status === 'SENDING') return { error: 'This one is already going out.' }

  const recipients = await db.newsletterSubscriber.findMany({
    where: { status: 'SUBSCRIBED' },
    select: { email: true, unsubscribeToken: true },
  })

  if (recipients.length === 0) {
    return { error: 'There is nobody on the list yet.' }
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENDING', lastError: null },
  })

  let sent = 0
  let failed = 0
  const BATCH = 20

  try {
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)
      const results = await Promise.all(
        batch.map((person) => {
          const email = campaignEmail({
            subject: campaign.subject,
            preheader: campaign.preheader,
            body: campaign.body,
            ctaLabel: campaign.ctaLabel,
            ctaUrl: campaign.ctaUrl,
            token: person.unsubscribeToken,
          })
          return sendEmail({ to: person.email, subject: email.subject, html: email.html })
        }),
      )
      for (const r of results) r.ok ? (sent += 1) : (failed += 1)

      // A brief pause between batches keeps well inside provider rate limits.
      if (i + BATCH < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }
  } catch (error) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED', lastError: String(error).slice(0, 500) },
    })
    return { error: 'Sending stopped partway. Check the newsletter and try again.' }
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: {
      status: failed === recipients.length ? 'FAILED' : 'SENT',
      sentAt: new Date(),
      recipientCount: sent,
      failureCount: failed,
    },
  })

  await recordAudit({
    user,
    action: 'campaign.send',
    entity: 'campaign',
    entityId: campaignId,
    meta: { subject: campaign.subject, sent, failed },
  })

  revalidatePath('/store-portal/newsletter')
  revalidatePath(`/store-portal/newsletter/campaigns/${campaignId}`)

  return {
    message:
      failed > 0
        ? `Sent to ${sent}. ${failed} could not be delivered.`
        : `Sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`,
  }
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const user = await requireUser()

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { subject: true, status: true },
  })
  if (!campaign) return
  if (campaign.status === 'SENT') return // keep the record of what went out

  await db.campaign.delete({ where: { id: campaignId } })
  await recordAudit({
    user,
    action: 'campaign.delete',
    entity: 'campaign',
    entityId: campaignId,
    meta: { subject: campaign.subject },
  })

  revalidatePath('/store-portal/newsletter')
  redirect('/store-portal/newsletter/campaigns')
}
