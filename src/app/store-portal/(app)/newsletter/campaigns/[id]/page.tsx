import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { CampaignForm } from '@/components/portal/CampaignForm'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const campaign = await db.campaign.findUnique({ where: { id }, select: { subject: true } })
  return { title: campaign?.subject || 'Newsletter' }
}

export default async function EditCampaignPage({ params }: Params) {
  const { id } = await params
  const [campaign, audience] = await Promise.all([
    db.campaign.findUnique({ where: { id } }),
    db.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
  ])
  if (!campaign) notFound()

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/newsletter" className="transition-colors hover:text-ink">
          Newsletter
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{campaign.subject || 'Untitled'}</span>
      </nav>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        {campaign.subject || 'Untitled'}
      </h1>

      <CampaignForm
        audience={audience}
        values={{
          id: campaign.id,
          subject: campaign.subject,
          preheader: campaign.preheader,
          body: campaign.body,
          ctaLabel: campaign.ctaLabel,
          ctaUrl: campaign.ctaUrl,
          status: campaign.status,
          sentAt: campaign.sentAt
            ? campaign.sentAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null,
          recipientCount: campaign.recipientCount,
          failureCount: campaign.failureCount,
        }}
      />
    </>
  )
}
