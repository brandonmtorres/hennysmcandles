import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { isStripeConfigured, isStripeTestMode } from '@/lib/stripe'
import { PortalNav } from '@/components/portal/PortalNav'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Store portal', template: '%s · Store portal' },
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Every authenticated portal page passes through here.
 *
 * `requireUser` is the guard. It is deliberately enforced in this layout AND
 * again inside every server action — routing alone is not an authorisation
 * boundary, and an action can be invoked directly.
 */
export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  const [pendingOrders, lowStock] = await Promise.all([
    db.order.count({ where: { status: 'PAID' } }),
    db.product.count({ where: { stock: { lte: 3 } } }),
  ])

  return (
    <div className="min-h-[100svh] bg-parchment text-ink">
      <PortalNav
        user={{ email: user.email, name: user.name }}
        badges={{ orders: pendingOrders, products: lowStock }}
      />

      <div className="mx-auto max-w-[86rem] px-5 pb-24 pt-8 sm:px-8">
        {!isStripeConfigured() ? (
          <Banner tone="warn">
            Payments are switched off. Add <code className="font-mono">STRIPE_SECRET_KEY</code>{' '}
            and <code className="font-mono">STRIPE_WEBHOOK_SECRET</code> to your{' '}
            <code className="font-mono">.env</code> file to start taking orders.
          </Banner>
        ) : isStripeTestMode() ? (
          <Banner tone="info">
            Stripe is in test mode. Orders placed now are not real — use card
            4242&nbsp;4242&nbsp;4242&nbsp;4242. Swap in your live keys when you are ready
            to open.
          </Banner>
        ) : null}

        {children}
      </div>
    </div>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: 'warn' | 'info'
  children: React.ReactNode
}) {
  const styles =
    tone === 'warn'
      ? 'border-danger/35 bg-danger/8 text-danger'
      : 'border-gild-deep/35 bg-gild/10 text-gild-deep'
  return (
    <div className={`mb-7 border px-5 py-3.5 text-[13px] leading-relaxed ${styles}`}>
      {children}
    </div>
  )
}
