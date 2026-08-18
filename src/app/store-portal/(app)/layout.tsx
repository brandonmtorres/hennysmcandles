import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { isSquareConfigured, isSquareSandbox } from '@/lib/square/client'
import { Banner } from '@/components/portal/ui'
import { isDurableStorageConfigured } from '@/lib/storage'
import { PortalNav } from '@/components/portal/PortalNav'

export const dynamic = 'force-dynamic'

const isProduction = process.env.NODE_ENV === 'production'

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
        <div className="[&>*]:mb-7">
        {!isSquareConfigured() ? (
          <Banner tone="warn">
            Payments are switched off. Add{' '}
            <code className="font-mono">SQUARE_ACCESS_TOKEN</code> and{' '}
            <code className="font-mono">SQUARE_LOCATION_ID</code> to your{' '}
            <code className="font-mono">.env</code> file to start taking orders.
          </Banner>
        ) : isSquareSandbox() ? (
          <Banner tone="info">
            Square is in sandbox mode. Orders placed now are not real — use card
            4111&nbsp;1111&nbsp;1111&nbsp;1111 with any future expiry and CVV 111. Set{' '}
            <code className="font-mono">SQUARE_ENVIRONMENT=production</code> with your
            live credentials when you are ready to open.
          </Banner>
        ) : null}

        {/* Only worth saying where it can actually bite: in development the
            local folder is the right answer and survives perfectly well. */}
        {isProduction && !isDurableStorageConfigured() ? (
          <Banner tone="warn">
            Product images are being written to this server&rsquo;s disk, which most
            hosts wipe on every deploy — a catalogue of photography can disappear
            without warning. Configure{' '}
            <code className="font-mono">S3_BUCKET</code> and its keys to store
            them somewhere permanent.
          </Banner>
        ) : null}
        </div>

        {children}
      </div>
    </div>
  )
}
