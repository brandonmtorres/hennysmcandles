import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { addressLines } from '@/lib/address'
import { getSettings } from '@/lib/settings'
import { PrintButton } from '@/components/portal/PrintButton'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const order = await db.order.findUnique({ where: { id }, select: { orderNumber: true } })
  return { title: `Packing slip · ${order?.orderNumber ?? 'Order'}` }
}

/**
 * The sheet that goes in the box.
 *
 * Printed, so it is laid out for paper rather than for the screen: black on
 * white, no portal chrome, and the address block positioned and sized to be
 * legible through a window envelope or to be cut out and stuck on. Everything
 * needed to pack the order correctly is on one side of one page — what to put
 * in, where it goes, and the note the owner left themselves.
 */
export default async function PackingSlipPage({ params }: Params) {
  const { id } = await params
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true } }),
    getSettings(),
  ])
  if (!order) notFound()

  const lines = addressLines(order.shippingAddress)
  const placed = order.createdAt.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-[52rem]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/store-portal/orders/${order.id}`}
          className="text-[12.5px] text-ink-soft transition-colors hover:text-ink"
        >
          ← Back to the order
        </Link>
        <PrintButton />
      </div>

      {/* The sheet itself. White ground and black type regardless of theme —
          this is going through a printer, not a screen. */}
      <article className="border border-rule bg-white p-10 text-[#111] print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-8 border-b border-[#ddd] pb-6">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[22px] tracking-[0.14em] uppercase">
              Hennys M.
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#8a7a52]">
              Homemade Candles
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-display)] text-[26px] leading-none">
              {order.orderNumber}
            </p>
            <p className="mt-2 text-[12px] text-[#555]">Placed {placed}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.24em] text-[#777]">Ship to</h2>
            {lines.length > 0 ? (
              <address className="mt-3 text-[15px] not-italic leading-[1.7]">
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="mt-3 text-[14px] text-[#a33]">
                No address recorded — check the order in Square before shipping.
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-[#555]">{order.email}</p>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-[0.24em] text-[#777]">
              Packed by
            </h2>
            <p className="mt-3 text-[15px]">{settings.storeName}</p>
            <p className="mt-1 text-[12.5px] text-[#555]">{settings.storeEmail}</p>
            {order.trackingNumber ? (
              <>
                <h2 className="mt-6 text-[10px] uppercase tracking-[0.24em] text-[#777]">
                  Tracking{order.carrier ? ` · ${order.carrier}` : ''}
                </h2>
                <p className="mt-2 text-[14px] tracking-[0.03em]">{order.trackingNumber}</p>
              </>
            ) : null}
          </section>
        </div>

        <section className="mt-9">
          <h2 className="text-[10px] uppercase tracking-[0.24em] text-[#777]">
            Pack these
          </h2>
          <table className="mt-3 w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-[#ddd] text-left text-[10px] uppercase tracking-[0.16em] text-[#777]">
                <th className="w-[4.5rem] py-2 font-normal">Qty</th>
                <th className="py-2 font-normal">Candle</th>
                <th className="py-2 text-right font-normal">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-[#eee]">
                  {/* Quantity first and set large: the number that gets
                      miscounted when someone is packing six boxes in a row. */}
                  <td className="py-3 align-top text-[19px] tabular-nums">
                    × {item.quantity}
                  </td>
                  <td className="py-3 align-top">{item.name}</td>
                  <td className="py-3 text-right align-top tabular-nums">
                    {formatMoney(item.lineTotalCents, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-[15rem] text-[13px]">
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
              <div className="mt-2 flex items-baseline justify-between border-t border-[#ddd] pt-2 text-[15px]">
                <dt>Paid</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.totalCents, order.currency)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {order.internalNotes ? (
          <section className="mt-8 border border-[#e6e0cf] bg-[#faf7f0] px-5 py-4">
            <h2 className="text-[10px] uppercase tracking-[0.24em] text-[#777]">
              Your note
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed">
              {order.internalNotes}
            </p>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-[#ddd] pt-5 text-center text-[12px] leading-relaxed text-[#666]">
          <p>Thank you for letting a little light into your home.</p>
          <p className="mt-1">
            Questions about this order? {settings.storeEmail} · quote {order.orderNumber}
          </p>
        </footer>
      </article>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <dt className="text-[#666]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
