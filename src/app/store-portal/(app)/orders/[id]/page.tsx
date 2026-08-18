import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { addressLines } from '@/lib/address'
import { Card, OrderStatusBadge } from '@/components/portal/ui'
import { OrderActions } from '@/components/portal/OrderActions'
import { OrderProgress } from '@/components/portal/OrderProgress'
import { CopyButton } from '@/components/portal/CopyButton'
import { addressText } from '@/lib/address'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    select: { orderNumber: true },
  })
  return { title: order?.orderNumber ?? 'Order' }
}

function parseAddress(raw: string | null) {
  const lines = addressLines(raw)
  return lines.length > 0 ? lines : null
}

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params
  const order = await db.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) notFound()

  const address = parseAddress(order.shippingAddress)

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/orders" className="transition-colors hover:text-ink">
          Orders
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{order.orderNumber}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1.5 text-[13.5px] text-ink-soft">
            Placed{' '}
            {order.createdAt.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            at{' '}
            {order.createdAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {order.addressFlagged ? (
        <div
          role="status"
          className="mb-8 border border-danger/40 bg-danger/8 px-5 py-4 text-[13.5px] leading-relaxed text-danger"
        >
          <strong className="font-normal uppercase tracking-[0.14em]">Check this one.</strong>{' '}
          The address Square collected does not match the destination this order was
          quoted for{order.shipToState ? ` (${order.shipToState})` : ''}, or the amount
          charged differs from the quote. Sales tax may be wrong, or it may be going
          somewhere the shop does not ship. Compare the address below against the total
          before packing it.
        </div>
      ) : null}

      <OrderProgress
        order={{
          id: order.id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          hasAddress: address !== null,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="What they ordered">
            <ul className="flex flex-col gap-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[14.5px] text-ink">{item.name}</span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-soft">
                      {formatMoney(item.unitPriceCents, order.currency)} × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] tabular-nums text-ink">
                    {formatMoney(item.lineTotalCents, order.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 border-t border-rule pt-5">
              <Row label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
              <Row
                label="Shipping"
                value={
                  order.shippingCents === 0
                    ? 'Free'
                    : formatMoney(order.shippingCents, order.currency)
                }
              />
              {order.taxCents > 0 ? (
                <Row label="Tax" value={formatMoney(order.taxCents, order.currency)} />
              ) : null}
              {order.discountCents > 0 ? (
                <Row
                  label="Discount"
                  value={`−${formatMoney(order.discountCents, order.currency)}`}
                />
              ) : null}
              <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
                <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-soft">
                  Total
                </dt>
                <dd className="font-[family-name:var(--font-display)] text-[22px] tabular-nums text-ink">
                  {formatMoney(order.totalCents, order.currency)}
                </dd>
              </div>
              {order.refundedCents > 0 ? (
                <Row
                  label="Refunded"
                  value={`−${formatMoney(order.refundedCents, order.currency)}`}
                />
              ) : null}
            </dl>
          </Card>

          <OrderActions
            order={{
              id: order.id,
              status: order.status,
              trackingNumber: order.trackingNumber ?? '',
              carrier: order.carrier ?? '',
              internalNotes: order.internalNotes ?? '',
              hasPayment: Boolean(order.squarePaymentId),
              totalCents: order.totalCents,
              refundedCents: order.refundedCents,
              currency: order.currency,
            }}
          />
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Customer">
            <p className="text-[14.5px] text-ink">{order.name ?? 'Not provided'}</p>
            <a
              href={`mailto:${order.email}`}
              className="mt-1 block text-[13.5px] text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-ink"
            >
              {order.email}
            </a>

            {address ? (
              <div className="mt-6 border-t border-rule pt-5">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">
                    Ship to
                  </p>
                  <CopyButton
                    value={addressText(order.shippingAddress)}
                    label="Copy address"
                    copiedLabel="Copied ✓"
                  />
                </div>
                <address className="text-[14px] not-italic leading-relaxed text-ink">
                  {address.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>
            ) : (
              <p className="mt-6 border-t border-rule pt-5 text-[13.5px] text-danger">
                No shipping address was recorded. Look this order up in Square before
                sending anything.
              </p>
            )}
          </Card>

          <Card title="Record">
            <dl className="flex flex-col gap-3.5 text-[13px]">
              <MetaRow
                label="Confirmation email"
                value={
                  order.confirmationEmailSentAt
                    ? order.confirmationEmailSentAt.toLocaleString('en-US')
                    : 'Not sent'
                }
              />
              <MetaRow
                label="Shipping email"
                value={
                  order.shippedEmailSentAt
                    ? order.shippedEmailSentAt.toLocaleString('en-US')
                    : 'Not sent'
                }
              />
              {order.shipToState ? (
                <MetaRow label="Taxed as" value={order.shipToState} />
              ) : null}
              <MetaRow label="Square order" value={order.squareOrderId} mono />
              {order.squarePaymentId ? (
                <MetaRow label="Payment" value={order.squarePaymentId} mono />
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <dt className="text-[13.5px] text-ink-soft">{label}</dt>
      <dd className="text-[13.5px] tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft">{label}</dt>
      <dd
        className={`mt-1 break-all text-ink ${mono ? 'font-mono text-[11.5px]' : 'text-[13px]'}`}
      >
        {value}
      </dd>
    </div>
  )
}
