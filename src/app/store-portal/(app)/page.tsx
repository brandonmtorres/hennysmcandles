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

  const [paidOrders, awaiting, toPack, recent, lowStock, productCount, subscribers] =
    await Promise.all([
      db.order.findMany({
        where: {
          status: { in: ['PAID', 'FULFILLED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { totalCents: true },
      }),
      db.order.count({ where: { status: 'PAID' } }),
      // Oldest first: the queue is worked from the front, and the one that has
      // been waiting longest is the one a customer is starting to wonder about.
      db.order.findMany({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        include: { items: { select: { quantity: true, name: true } } },
      }),
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

      {/* The working queue. It sits above everything else because it is the
          one thing on this page with a deadline attached, and it disappears
          entirely when there is nothing to do — an empty panel every morning
          teaches you to stop looking at the page. */}
      {toPack.length > 0 ? (
        <div className="mt-8">
          <Card
            title={`To pack · ${awaiting}`}
            description="Oldest first. Open one to print its slip and send it."
            actions={
              <Link
                href="/store-portal/orders?filter=to-pack"
                className="text-[12px] text-ink-soft transition-colors hover:text-ink"
              >
                See all
              </Link>
            }
          >
            <ul className="flex flex-col">
              {toPack.map((order) => {
                const days = Math.floor(
                  (Date.now() - order.createdAt.getTime()) / (24 * 60 * 60 * 1000),
                )
                const candles = order.items.reduce((n, i) => n + i.quantity, 0)
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-rule py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/store-portal/orders/${order.id}`}
                        className="text-[14.5px] text-ink underline decoration-rule underline-offset-4 transition-colors hover:decoration-ink"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="ml-3 text-[13px] text-ink-soft">
                        {order.name ?? order.email}
                      </span>
                      <p className="mt-1 text-[12.5px] text-ink-soft">
                        {candles} candle{candles === 1 ? '' : 's'} ·{' '}
                        {days === 0
                          ? 'came in today'
                          : `waiting ${days} day${days === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {days >= 2 ? <Badge tone="bad">Overdue</Badge> : null}
                      <Link
                        href={`/store-portal/orders/${order.id}/packing-slip`}
                        className="text-[11px] uppercase tracking-[0.16em] text-gild-deep transition-opacity hover:opacity-70"
                      >
                        Packing slip →
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      ) : null}

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
