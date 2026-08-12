import Link from 'next/link'
import { db } from '@/lib/db'
import { Badge, EmptyState, PortalButton } from '@/components/portal/ui'
import { SavedNotice } from '@/components/portal/SavedNotice'
import { CollectionSaleToggle } from '@/components/portal/CollectionSaleToggle'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Collections' }

function describeWindow(
  visibility: string,
  startsAt: Date | null,
  endsAt: Date | null,
): { label: string; tone: 'good' | 'warn' | 'neutral' | 'bad' } {
  const now = new Date()
  if (visibility === 'HIDDEN') return { label: 'Hidden', tone: 'neutral' }
  if (visibility === 'VISIBLE') return { label: 'Showing', tone: 'good' }

  if (startsAt && now < startsAt) {
    return {
      label: `Starts ${startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      tone: 'warn',
    }
  }
  if (endsAt && now > endsAt) return { label: 'Ended', tone: 'neutral' }
  return { label: 'Showing', tone: 'good' }
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams

  const collections = await db.collection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { products: true } } },
  })

  return (
    <>
      {saved ? <SavedNotice message="Collection saved." /> : null}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
            Collections
          </h1>
          <p className="mt-1.5 max-w-[70ch] text-[14px] text-ink-soft">
            Group candles for a season or a promotion. A collection can discount
            everything inside it at once, and a scheduled one appears and disappears
            on its own.
          </p>
        </div>
        <Link href="/store-portal/collections/new">
          <PortalButton tone="primary">New collection</PortalButton>
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="border border-rule bg-surface">
          <EmptyState
            title="No collections yet"
            body="Make one for a seasonal edit, a gift set, or a promotion across several candles."
            action={
              <Link href="/store-portal/collections/new">
                <PortalButton tone="primary">New collection</PortalButton>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="border border-rule bg-surface">
          <div className="hidden border-b border-rule px-5 py-3 lg:grid lg:grid-cols-[1fr_7rem_9rem_11rem_5rem] lg:items-center lg:gap-4">
            {['Collection', 'Candles', 'Status', 'Promotion', ''].map((heading, i) => (
              <span
                key={i}
                className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft"
              >
                {heading}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-rule">
            {collections.map((collection) => {
              const status = describeWindow(
                collection.visibility,
                collection.startsAt,
                collection.endsAt,
              )
              return (
                <li key={collection.id} className="px-5 py-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_7rem_9rem_11rem_5rem] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/store-portal/collections/${collection.id}`}
                        className="block truncate text-[14.5px] text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-gild-deep"
                      >
                        {collection.name}
                      </Link>
                      <p className="mt-0.5 truncate text-[12px] text-ink-soft">
                        /collections/{collection.slug}
                        {collection.tagline ? ` · ${collection.tagline}` : ''}
                      </p>
                    </div>

                    <span className="text-[13.5px] text-ink">
                      <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft lg:hidden">
                        Candles{' '}
                      </span>
                      {collection._count.products}
                    </span>

                    <span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </span>

                    <CollectionSaleToggle
                      id={collection.id}
                      name={collection.name}
                      active={collection.saleActive}
                      percent={collection.salePercent}
                    />

                    <div className="lg:text-right">
                      <Link
                        href={`/store-portal/collections/${collection.id}`}
                        className="text-[12px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
