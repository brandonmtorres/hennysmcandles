import Link from 'next/link'
import { db } from '@/lib/db'
import { getGrowth, getListStats } from '@/lib/newsletter'
import { Badge, Card, EmptyState, PortalButton, StatTile } from '@/components/portal/ui'
import { GrowthChart } from '@/components/portal/GrowthChart'
import { AddSubscriber } from '@/components/portal/AddSubscriber'
import { SubscriberRow } from '@/components/portal/SubscriberRow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Newsletter' }

const PAGE_SIZE = 40

const SOURCE_LABELS: Record<string, string> = {
  footer: 'Footer',
  popup: 'Popup',
  checkout: 'Checkout',
  manual: 'Added by you',
  import: 'Imported',
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const read = (key: string) => {
    const v = params[key]
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  }

  const q = read('q')
  const status = ['SUBSCRIBED', 'UNSUBSCRIBED'].includes(read('status'))
    ? read('status')
    : 'SUBSCRIBED'
  const source = read('source')
  const page = Math.max(1, Number.parseInt(read('page'), 10) || 1)
  const window = [7, 30, 90].includes(Number(read('days'))) ? Number(read('days')) : 30

  const where = {
    status,
    ...(source ? { source } : {}),
    ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}),
  }

  const [stats, growth, subscribers, total, campaigns] = await Promise.all([
    getListStats(),
    getGrowth(window),
    db.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.newsletterSubscriber.count({ where }),
    db.campaign.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
  ])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams()
    const merged = { q, status, source, days: String(window), page: '1', ...patch }
    if (merged.q) next.set('q', merged.q)
    if (merged.status !== 'SUBSCRIBED') next.set('status', merged.status)
    if (merged.source) next.set('source', merged.source)
    if (merged.days !== '30') next.set('days', merged.days)
    if (merged.page !== '1') next.set('page', merged.page)
    const qs = next.toString()
    return qs ? `/store-portal/newsletter?${qs}` : '/store-portal/newsletter'
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
            Newsletter
          </h1>
          <p className="mt-1.5 max-w-[70ch] text-[14px] text-ink-soft">
            Who is on the list, how it is growing, and what you have sent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/store-portal/newsletter/popup">
            <PortalButton tone="secondary">Edit the popup</PortalButton>
          </Link>
          <a href="/api/portal/newsletter/export?scope=subscribed" download>
            <PortalButton tone="secondary">Export CSV</PortalButton>
          </a>
          <Link href="/store-portal/newsletter/campaigns/new">
            <PortalButton tone="primary">Write a newsletter</PortalButton>
          </Link>
        </div>
      </div>

      {/* Headline figures */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="On the list"
          value={String(stats.subscribed)}
          detail={
            stats.bySource[0]
              ? `Mostly from ${SOURCE_LABELS[stats.bySource[0].source] ?? stats.bySource[0].source}`
              : 'No signups yet'
          }
        />
        <StatTile
          label="Joined · 30 days"
          value={`+${stats.joined30}`}
          detail="New and returning"
        />
        <StatTile
          label="Left · 30 days"
          value={String(stats.left30)}
          detail={stats.left30 === 0 ? 'Nobody has left' : 'Unsubscribed'}
          tone={stats.left30 > 0 ? 'warn' : undefined}
        />
        <StatTile
          label="Net change"
          value={`${stats.net30 >= 0 ? '+' : ''}${stats.net30}`}
          detail={
            stats.unsubscribed === 0
              ? 'Nobody has ever left'
              : `${stats.unsubscribed} off the list in total`
          }
          tone={stats.net30 < 0 ? 'bad' : undefined}
        />
      </div>

      {/* Growth */}
      <div className="mt-8">
        <Card
          title="Additions and losses"
          description="Daily joins and leaves, with the size of the list beneath."
          actions={
            <div className="flex gap-3">
              {[7, 30, 90].map((d) => (
                <Link
                  key={d}
                  href={href({ days: String(d) })}
                  className={[
                    'text-[12px] transition-colors',
                    window === d
                      ? 'text-ink underline decoration-gild-deep underline-offset-4'
                      : 'text-ink-soft hover:text-ink',
                  ].join(' ')}
                >
                  {d} days
                </Link>
              ))}
            </div>
          }
        >
          <GrowthChart days={growth} />
        </Card>
      </div>

      {/* Recent campaigns */}
      <div className="mt-8">
        <Card
          title="Newsletters"
          description="What you have sent, and anything still in draft."
          actions={
            <Link
              href="/store-portal/newsletter/campaigns"
              className="text-[12px] text-ink-soft transition-colors hover:text-ink"
            >
              See all
            </Link>
          }
          className="overflow-hidden"
        >
          {campaigns.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              body="Write one when you have something worth saying — a new pour, or a seasonal batch."
              action={
                <Link href="/store-portal/newsletter/campaigns/new">
                  <PortalButton tone="primary">Write a newsletter</PortalButton>
                </Link>
              }
            />
          ) : (
            <ul className="-m-6 divide-y divide-rule">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/store-portal/newsletter/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-parchment"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-ink">
                        {c.subject || 'Untitled'}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-soft">
                        {c.status === 'SENT' && c.sentAt
                          ? `Sent to ${c.recipientCount} on ${c.sentAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'Draft'}
                      </span>
                    </span>
                    <Badge tone={c.status === 'SENT' ? 'good' : c.status === 'FAILED' ? 'bad' : 'neutral'}>
                      {c.status === 'SENT' ? 'Sent' : c.status === 'FAILED' ? 'Failed' : 'Draft'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* The list */}
      <div className="mt-8">
        <Card
          title="The list"
          description="Search, filter, add somebody by hand, or take them off."
        >
          <AddSubscriber />

          <form method="get" className="mt-6 flex flex-wrap items-end gap-3 border-t border-rule pt-6">
            <label className="min-w-[14rem] flex-1">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Search
              </span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Email or name…"
                className="h-10 w-full border border-rule bg-surface px-3 text-[14px] text-ink placeholder:text-ink-soft/55 focus:border-gild-deep focus:outline-none"
              />
            </label>
            <input type="hidden" name="days" value={window} />
            <label>
              <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Status
              </span>
              <select
                name="status"
                defaultValue={status}
                className="h-10 border border-rule bg-surface px-3 text-[13.5px] text-ink focus:border-gild-deep focus:outline-none"
              >
                <option value="SUBSCRIBED">On the list</option>
                <option value="UNSUBSCRIBED">Unsubscribed</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                Source
              </span>
              <select
                name="source"
                defaultValue={source}
                className="h-10 border border-rule bg-surface px-3 text-[13.5px] text-ink focus:border-gild-deep focus:outline-none"
              >
                <option value="">Anywhere</option>
                {stats.bySource.map((s) => (
                  <option key={s.source} value={s.source}>
                    {SOURCE_LABELS[s.source] ?? s.source} ({s.count})
                  </option>
                ))}
              </select>
            </label>
            <PortalButton type="submit" tone="secondary">
              Apply
            </PortalButton>
            {q || source || status !== 'SUBSCRIBED' ? (
              <Link href="/store-portal/newsletter">
                <PortalButton type="button" tone="ghost">
                  Clear
                </PortalButton>
              </Link>
            ) : null}
          </form>

          <div className="-mx-6 mt-6 border-t border-rule">
            {subscribers.length === 0 ? (
              <EmptyState
                title={q ? 'Nobody matches that' : 'Nobody here yet'}
                body={
                  q
                    ? 'Try a different search, or clear the filters.'
                    : 'Signups from the footer and the popup will appear here.'
                }
              />
            ) : (
              <ul className="divide-y divide-rule">
                {subscribers.map((s) => (
                  <SubscriberRow
                    key={s.id}
                    subscriber={{
                      id: s.id,
                      email: s.email,
                      name: s.name,
                      status: s.status,
                      source: SOURCE_LABELS[s.source] ?? s.source,
                      subscribedAt: s.subscribedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }),
                      unsubscribedAt: s.unsubscribedAt
                        ? s.unsubscribedAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : null,
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          {pages > 1 ? (
            <div className="mt-5 flex items-center justify-between border-t border-rule pt-5">
              <span className="text-[12.5px] text-ink-soft">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={href({ page: String(page - 1) })}>
                    <PortalButton tone="secondary" size="sm">
                      Previous
                    </PortalButton>
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link href={href({ page: String(page + 1) })}>
                    <PortalButton tone="secondary" size="sm">
                      Next
                    </PortalButton>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </>
  )
}
