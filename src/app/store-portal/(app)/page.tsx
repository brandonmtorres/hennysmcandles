import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import {
  Badge,
  Card,
  EmptyState,
  OrderStatusBadge,
  StatTile,
} from '@/components/portal/ui'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const settings = await getSettings()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [paidOrders, awaiting, recent, lowStock, productCount, subscribers] =
    await Promise.all([
      db.order.findMany({
        where: {
          status: { in: ['PAID', 'FULFILLED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { totalCents: true },
      }),
      db.order.count({ where: { status: 'PAID' } }),
      db.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { items: { select: { quantity: true } } },
      }),
      db.product.findMany({
        where: { stock: { lte: settings.lowStockThreshold } },
        orderBy: { stock: 'asc' },
        select: { id: true, name: true, stock: true, visibility: true },
        take: 8,
      }),
      db.product.count(),
      db.newsletterSubscriber.count(),
    ])

  const revenueCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0)
  const soldOut = lowStock.filter((p) => p.stock === 0).length

  return (
    <>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Everything that needs your attention today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Revenue · 30 days"
          value={formatMoney(revenueCents, settings.currency)}
          detail={`${paidOrders.length} order${paidOrders.length === 1 ? '' : 's'}`}
        />
        <StatTile
          label="Awaiting shipment"
          value={String(awaiting)}
          detail={awaiting === 0 ? 'Nothing to pack' : 'Ready to pack and post'}
          tone={awaiting > 0 ? 'warn' : undefined}
        />
        <StatTile
          label="Low or sold out"
          value={String(lowStock.length)}
          detail={soldOut > 0 ? `${soldOut} sold out entirely` : 'Time to pour more'}
          tone={soldOut > 0 ? 'bad' : lowStock.length > 0 ? 'warn' : undefined}
        />
        <StatTile
          label="Catalogue"
          value={String(productCount)}
          detail={`${subscribers} on the mailing list`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card
          title="Recent orders"
          actions={
            <Link
              href="/store-portal/orders"
              className="text-[12px] text-ink-soft transition-colors hover:text-ink"
            >
              See all
            </Link>
          }
          className="overflow-hidden"
        >
          {recent.length === 0 ? (
            <EmptyState
              title="No orders yet"
              body="When someone buys a candle it will appear here, and you will get an email."
            />
          ) : (
            <ul className="-m-6 divide-y divide-rule">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/store-portal/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-parchment"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-ink">
                        {order.orderNumber}
                        <span className="text-ink-soft"> · {order.email}</span>
                      </p>
                      <p className="mt-1 text-[12.5px] text-ink-soft">
                        {order.items.reduce((n, i) => n + i.quantity, 0)} item
                        {order.items.reduce((n, i) => n + i.quantity, 0) === 1 ? '' : 's'} ·{' '}
                        {order.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="w-20 text-right text-[14px] tabular-nums text-ink">
                        {formatMoney(order.totalCents, order.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Needs a new pour"
          description={`At or below ${settings.lowStockThreshold} in stock.`}
          className="overflow-hidden"
        >
          {lowStock.length === 0 ? (
            <EmptyState
              title="Everything is stocked"
              body="No candle is running low. Nothing to do here."
            />
          ) : (
            <ul className="-m-6 divide-y divide-rule">
              {lowStock.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/store-portal/products/${product.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-parchment"
                  >
                    <span className="truncate text-[14px] text-ink">{product.name}</span>
                    {product.stock === 0 ? (
                      <Badge tone="bad">Sold out</Badge>
                    ) : (
                      <Badge tone="warn">{product.stock} left</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
