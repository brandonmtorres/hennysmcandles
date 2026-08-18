import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { ButtonLink } from '@/components/ui/Button'
import { ClearCartOnMount } from '@/components/cart/ClearCartOnMount'
import { OrderPoller } from '@/components/cart/OrderPoller'
import { ScriptText } from '@/components/brand/ScriptText'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ cs?: string }>
}) {
  const { cs: checkoutSessionId } = await searchParams

  // The order is created by the Square webhook, which may land a moment after
  // the customer is redirected here. A missing order is therefore normal, not
  // an error — the page reassures either way.
  //
  // The lookup goes through our own checkout session rather than a Square id,
  // so the redirect carries an identifier we issued and control.
  const session = checkoutSessionId
    ? await db.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        select: { squareOrderId: true },
      })
    : null

  const order = session?.squareOrderId
    ? await db.order.findUnique({
        where: { squareOrderId: session.squareOrderId },
        include: { items: true },
      })
    : null

  return (
    <section className="veil relative flex min-h-[78svh] items-center overflow-hidden px-5 py-24 sm:px-8">
      <ClearCartOnMount />

      <div className="mx-auto w-full max-w-2xl text-center">
        <span
          className="mx-auto block text-4xl"
          aria-hidden="true"
          style={{ animation: 'flicker 3.4s ease-in-out infinite' }}
        >
          ☾
        </span>

        <p className="label mt-10 text-gild/90">Thank you</p>
        <h1 className="display-lg mt-5 text-wax">
          Your order is <ScriptText className="text-gild">confirmed</ScriptText>
        </h1>

        <p className="lede mx-auto mt-6 max-w-[46ch]">
          {order
            ? `Order ${order.orderNumber} is in. A confirmation is on its way to ${order.email}.`
            : 'Payment received, and your candles are spoken for.'}
        </p>

        {/* The webhook that writes the order can land a moment after the
            customer does. Rather than leaving them on a page that never
            resolves, it fills itself in. */}
        {!order && checkoutSessionId ? <OrderPoller /> : null}

        {order ? (
          <div className="mx-auto mt-12 max-w-md border-t border-wax/12 pt-8 text-left">
            <ul className="flex flex-col gap-4">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4">
                  <span className="text-[14.5px] text-wax/85">
                    {item.name}
                    <span className="text-smoke"> × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 text-[14px] tabular-nums text-wax">
                    {formatMoney(item.lineTotalCents, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-baseline justify-between border-t border-wax/12 pt-5">
              <span className="label text-smoke">Total</span>
              <span className="font-[family-name:var(--font-display)] text-xl tabular-nums text-wax">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </div>
        ) : null}

        <p className="mx-auto mt-12 max-w-[48ch] text-[14px] leading-relaxed text-smoke">
          Each candle is poured, set with its crystal and finished by hand, so give us a
          day or two before it ships. We will email you the moment it is on its way.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/products" size="md">
            Keep exploring
          </ButtonLink>
          <ButtonLink href="/ritual" variant="quiet">
            How to burn it properly
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
