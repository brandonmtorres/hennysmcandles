import Link from 'next/link'
import { db } from '@/lib/db'
import { Badge, EmptyState, PortalButton } from '@/components/portal/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Newsletters' }

export default async function CampaignsPage() {
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/newsletter" className="transition-colors hover:text-ink">
          Newsletter
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">All newsletters</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Newsletters
        </h1>
        <Link href="/store-portal/newsletter/campaigns/new">
          <PortalButton tone="primary">Write a newsletter</PortalButton>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="border border-rule bg-surface">
          <EmptyState
            title="Nothing written yet"
            body="Write one when you have something worth saying."
            action={
              <Link href="/store-portal/newsletter/campaigns/new">
                <PortalButton tone="primary">Write a newsletter</PortalButton>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="border border-rule bg-surface">
          <ul className="divide-y divide-rule">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/store-portal/newsletter/campaigns/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-parchment"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] text-ink">
                      {c.subject || 'Untitled'}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-soft">
                      {c.status === 'SENT' && c.sentAt
                        ? `Sent to ${c.recipientCount} on ${c.sentAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                        : `Started ${c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                  </span>
                  <Badge tone={c.status === 'SENT' ? 'good' : c.status === 'FAILED' ? 'bad' : 'neutral'}>
                    {c.status === 'SENT' ? 'Sent' : c.status === 'FAILED' ? 'Failed' : 'Draft'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
