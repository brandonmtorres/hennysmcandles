import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { describePromo } from '@/lib/promo'
import { Badge, EmptyState, PortalButton } from '@/components/portal/ui'
import { SavedNotice } from '@/components/portal/SavedNotice'
import { PromoToggle } from '@/components/portal/PromoToggle'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Promo codes' }

function status(promo: {
  active: boolean
  startsAt: Date | null
  endsAt: Date | null
  maxRedemptions: number
  timesRedeemed: number
}): { label: string; tone: 'good' | 'warn' | 'neutral' | 'bad' } {
  const now = new Date()
  if (!promo.active) return { label: 'Off', tone: 'neutral' }
  if (promo.startsAt && now < promo.startsAt) {
    return {
      label: `From ${promo.startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      tone: 'warn',
    }
  }
  if (promo.endsAt && now > promo.endsAt) return { label: 'Expired', tone: 'neutral' }
  if (promo.maxRedemptions > 0 && promo.timesRedeemed >= promo.maxRedemptions) {
    return { label: 'Used up', tone: 'bad' }
  }
  return { label: 'Live', tone: 'good' }
}

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const codes = await db.promoCode.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <>
      {saved ? <SavedNotice message="Promo code saved." /> : null}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
            Promo codes
          </h1>
          <p className="mt-1.5 max-w-[70ch] text-[14px] text-ink-soft">
            Discount codes customers type at checkout. Every code is checked again
            when the order is placed, so a limit or an end date is always honoured.
          </p>
        </div>
        <Link href="/store-portal/promo-codes/new">
          <PortalButton tone="primary">New code</PortalButton>
        </Link>
      </div>

      {codes.length === 0 ? (
        <div className="border border-rule bg-surface">
          <EmptyState
            title="No codes yet"
            body="Make one for a newsletter, a first order, or a seasonal push."
            action={
              <Link href="/store-portal/promo-codes/new">
                <PortalButton tone="primary">New code</PortalButton>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="border border-rule bg-surface">
          <div className="hidden border-b border-rule px-5 py-3 lg:grid lg:grid-cols-[12rem_9rem_9rem_8rem_8rem_5rem] lg:items-center lg:gap-4">
            {['Code', 'Discount', 'Minimum', 'Used', 'Status', ''].map((h, i) => (
              <span key={i} className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
                {h}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-rule">
            {codes.map((promo) => {
              const s = status(promo)
              return (
                <li key={promo.id} className="px-5 py-4">
                  <div className="grid gap-3 lg:grid-cols-[12rem_9rem_9rem_8rem_8rem_5rem] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/store-portal/promo-codes/${promo.id}`}
                        className="block truncate font-mono text-[14px] tracking-[0.06em] text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-gild-deep"
                      >
                        {promo.code}
                      </Link>
                      {promo.note ? (
                        <p className="mt-0.5 truncate text-[12px] text-ink-soft">
                          {promo.note}
                        </p>
                      ) : null}
                    </div>

                    <span className="text-[13.5px] text-ink">{describePromo(promo)}</span>

                    <span className="text-[13.5px] text-ink-soft">
                      {promo.minSubtotalCents > 0
                        ? `over ${formatMoney(promo.minSubtotalCents)}`
                        : '—'}
                    </span>

                    <span className="text-[13.5px] tabular-nums text-ink-soft">
                      {promo.timesRedeemed}
                      {promo.maxRedemptions > 0 ? ` / ${promo.maxRedemptions}` : ''}
                    </span>

                    <span className="flex items-center gap-2.5">
                      <Badge tone={s.tone}>{s.label}</Badge>
                      <PromoToggle id={promo.id} code={promo.code} active={promo.active} />
                    </span>

                    <div className="lg:text-right">
                      <Link
                        href={`/store-portal/promo-codes/${promo.id}`}
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
