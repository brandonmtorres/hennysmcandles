import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { ButtonLink } from '@/components/ui/Button'
import { ClearCartOnMount } from '@/components/cart/ClearCartOnMount'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  // The order is created by the Stripe webhook, which may land a moment after
  // the customer is redirected here. A missing order is therefore normal, not
  // an error — the page reassures either way.
  const order = sessionId
    ? await db.order.findUnique({
        where: { stripeSessionId: sessionId },
        include: { items: true },
      })
    : null

  return (
    <section className="relative flex min-h-[78svh] items-center overflow-hidden bg-obsidian px-5 py-24 sm:px-8">
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
          Your order is <span className="italic text-gild">confirmed</span>
        </h1>

        <p className="lede mx-auto mt-6 max-w-[46ch]">
          {order
            ? `Order ${order.orderNumber} is in. A confirmation is on its way to ${order.email}.`
            : 'Payment received. A confirmation email is on its way to you now.'}
        </p>

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
