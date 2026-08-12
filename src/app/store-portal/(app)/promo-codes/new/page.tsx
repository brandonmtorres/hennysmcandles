import Link from 'next/link'
import { PromoForm } from '@/components/portal/PromoForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New promo code' }

export default function NewPromoCodePage() {
  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/promo-codes" className="transition-colors hover:text-ink">
          Promo codes
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">New code</span>
      </nav>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        New promo code
      </h1>

      <PromoForm
        values={{
          id: null,
          code: '',
          kind: 'PERCENT',
          value: '',
          minSubtotal: '0.00',
          maxRedemptions: 0,
          active: true,
          note: '',
          startsAt: '',
          endsAt: '',
          timesRedeemed: 0,
        }}
      />
    </>
  )
}
