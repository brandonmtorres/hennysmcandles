import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { EmptyState, OrderStatusBadge } from '@/components/portal/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orders' }

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'to-pack', label: 'To pack', status: 'PAID' },
  { key: 'shipped', label: 'Shipped', status: 'FULFILLED' },
  { key: 'refunded', label: 'Refunded', status: 'REFUNDED' },
] as const

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'all' } = await searchParams
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]
  const statusFilter = 'status' in active ? active.status : undefined

  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { items: { select: { quantity: true, name: true } } },
    }),
    db.order.groupBy({ by: ['status'], _count: true }),
  ])

  const countFor = (status?: string) =>
    status
      ? (counts.find((c) => c.status === status)?._count ?? 0)
      : counts.reduce((n, c) => n + c._count, 0)

  return (
    <>
      <div className="mb-7">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Orders
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Every order, newest first. Open one to add tracking or issue a refund.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter orders">
        {FILTERS.map((item) => {
          const isActive = item.key === active.key
          const count = countFor('status' in item ? item.status : undefined)
          return (
            <Link
              key={item.key}
              href={`/store-portal/orders?filter=${item.key}`}
              role="tab"
              aria-selected={isActive}
              className={[
                'flex items-center gap-2 border px-3.5 py-2 text-[12.5px] transition-colors',
                isActive
                  ? 'border-ink bg-ink text-wax'
                  : 'border-rule bg-surface text-ink-soft hover:border-ink/35 hover:text-ink',
              ].join(' ')}
            >
              {item.label}
              <span className={isActive ? 'text-wax/60' : 'text-ink-soft/70'}>{count}</span>
            </Link>
          )
        })}
      </div>

      <div className="border border-rule bg-surface">
        {orders.length === 0 ? (
          <EmptyState
            title={active.key === 'all' ? 'No orders yet' : `Nothing ${active.label.toLowerCase()}`}
            body={
              active.key === 'all'
                ? 'When someone buys a candle it lands here, and you get an email straight away.'
                : 'Try another filter to see the rest of your orders.'
            }
          />
        ) : (
          <ul className="divide-y divide-rule">
            {orders.map((order) => {
              const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
              return (
                <li key={order.id}>
                  <Link
                    href={`/store-portal/orders/${order.id}`}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-parchment sm:grid-cols-[8rem_1fr_auto_7rem] sm:items-center sm:gap-5"
                  >
                    <span className="text-[14px] text-ink">{order.orderNumber}</span>

                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-ink">
                        {order.name ?? order.email}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-ink-soft">
                        {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
                        {order.items
                          .map((i) => i.name)
                          .slice(0, 2)
                          .join(', ')}
                        {order.items.length > 2 ? '…' : ''}
                        {' · '}
                        {order.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </span>

                    <OrderStatusBadge status={order.status} />

                    <span className="text-[14px] tabular-nums text-ink sm:text-right">
                      {formatMoney(order.totalCents, order.currency)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
