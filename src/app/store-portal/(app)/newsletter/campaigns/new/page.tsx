import Link from 'next/link'
import { db } from '@/lib/db'
import { CampaignForm } from '@/components/portal/CampaignForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Write a newsletter' }

export default async function NewCampaignPage() {
  const audience = await db.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } })

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/newsletter" className="transition-colors hover:text-ink">
          Newsletter
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">Write</span>
      </nav>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        Write a newsletter
      </h1>

      <CampaignForm
        audience={audience}
        values={{
          id: null,
          subject: '',
          preheader: '',
          body: '',
          ctaLabel: '',
          ctaUrl: '',
          status: 'DRAFT',
          sentAt: null,
          recipientCount: 0,
          failureCount: 0,
        }}
      />
    </>
  )
}
