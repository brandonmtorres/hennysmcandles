import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { PromoForm } from '@/components/portal/PromoForm'
import { Card } from '@/components/portal/ui'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const promo = await db.promoCode.findUnique({ where: { id }, select: { code: true } })
  return { title: promo?.code ?? 'Promo code' }
}

function toLocalInput(date: Date | null): string {
  if (!date) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default async function EditPromoCodePage({ params }: Params) {
  const { id } = await params
  const promo = await db.promoCode.findUnique({
    where: { id },
    include: { redemptions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
  if (!promo) notFound()

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/promo-codes" className="transition-colors hover:text-ink">
          Promo codes
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{promo.code}</span>
      </nav>

      <h1 className="mb-8 font-mono text-[26px] tracking-[0.06em] text-ink">
        {promo.code}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <PromoForm
          values={{
            id: promo.id,
            code: promo.code,
            kind: promo.kind,
            value:
              promo.kind === 'FIXED'
                ? (promo.value / 100).toFixed(2)
                : String(promo.value),
            minSubtotal: (promo.minSubtotalCents / 100).toFixed(2),
            maxRedemptions: promo.maxRedemptions,
            active: promo.active,
            note: promo.note,
            startsAt: toLocalInput(promo.startsAt),
            endsAt: toLocalInput(promo.endsAt),
            timesRedeemed: promo.timesRedeemed,
          }}
        />

        <Card title="Redemptions" description="The last ten times this code was used.">
          {promo.redemptions.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">Not used yet.</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {promo.redemptions.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <Link
                      href="/store-portal/orders"
                      className="block truncate text-[13.5px] text-ink"
                    >
                      {r.orderNumber}
                    </Link>
                    <span className="block truncate text-[11.5px] text-ink-soft">
                      {r.email ?? 'no email'} ·{' '}
                      {r.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink">
                    −{formatMoney(r.discountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
