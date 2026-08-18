import Link from 'next/link'
import { trackingUrlFor } from '@/lib/carriers'

/**
 * Where this order has got to, and what to do next.
 *
 * An order has only two states that matter to the owner — paid, and gone — but
 * the work between them has an order to it that the screen was not showing:
 * check the address, print the slip, pack it, then enter tracking. Someone
 * packing their first order should not have to infer that sequence from a page
 * of cards. So it is written down, with the current step named.
 */
export function OrderProgress({
  order,
}: {
  order: {
    id: string
    status: string
    trackingNumber: string | null
    carrier: string | null
    hasAddress: boolean
  }
}) {
  const shipped = order.status === 'FULFILLED'
  const refunded = order.status === 'REFUNDED'
  const trackingUrl = trackingUrlFor(order.carrier, order.trackingNumber)

  if (refunded) {
    return (
      <div className="mb-8 border border-rule bg-surface px-5 py-4 text-[13.5px] text-ink-soft">
        This order was refunded. Nothing further to send.
      </div>
    )
  }

  type Step = {
    title: string
    done: boolean
    detail: string
    /** A link within the portal. */
    action?: { href: string; label: string }
    /** A link out to the carrier. */
    external?: { href: string; label: string }
  }

  const steps: Step[] = [
    {
      title: 'Payment received',
      done: true,
      detail: 'Square has the money and the stock has already come off the shelf.',
    },
    {
      // Named for what we can actually verify. The shop knows an address was
      // collected; it cannot know that anyone read it.
      title: order.hasAddress ? 'Address on file' : 'No address',
      done: order.hasAddress,
      detail: order.hasAddress
        ? 'Read it against the label before you stick it down.'
        : 'Nothing was recorded — look this order up in Square before shipping.',
    },
    {
      title: 'Print the packing slip',
      done: shipped,
      detail: 'One sheet with the quantities, the address and your note.',
      action: { href: `/store-portal/orders/${order.id}/packing-slip`, label: 'Open slip' },
    },
    {
      title: shipped ? 'Shipped' : 'Add tracking and mark it shipped',
      done: shipped,
      detail: shipped
        ? order.trackingNumber
          ? `${order.carrier ? `${order.carrier} · ` : ''}${order.trackingNumber}`
          : 'Marked as shipped without a tracking number.'
        : 'The customer is emailed the moment you do, with a link to follow it.',
      ...(trackingUrl ? { external: { href: trackingUrl, label: 'Track it' } } : {}),
    },
  ]

  // The first unfinished step is the one to do now.
  const currentIndex = steps.findIndex((s) => !s.done)

  return (
    <ol className="mb-8 grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-4">
      {steps.map((step, i) => {
        const isCurrent = i === currentIndex
        return (
          <li
            key={step.title}
            aria-current={isCurrent ? 'step' : undefined}
            // One background class, not two: `bg-surface bg-gild/8` leaves the
            // winner to stylesheet order rather than to intent, and the tint
            // silently lost.
            className={`px-5 py-4 ${isCurrent ? 'bg-gild/10' : 'bg-surface'}`}
          >
            <div className="flex items-center gap-2.5">
              <Marker done={step.done} current={isCurrent} index={i + 1} />
              <p
                className={`text-[13px] leading-snug ${
                  isCurrent ? 'text-ink' : step.done ? 'text-ink-soft' : 'text-ink-soft'
                }`}
              >
                {step.title}
              </p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{step.detail}</p>
            {step.action ? (
              <Link
                href={step.action.href}
                className="mt-2 inline-block text-[11px] uppercase tracking-[0.16em] text-gild-deep transition-opacity hover:opacity-70"
              >
                {step.action.label} →
              </Link>
            ) : null}
            {step.external ? (
              <a
                href={step.external.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-[11px] uppercase tracking-[0.16em] text-gild-deep transition-opacity hover:opacity-70"
              >
                {step.external.label} →
              </a>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function Marker({
  done,
  current,
  index,
}: {
  done: boolean
  current: boolean
  index: number
}) {
  if (done) {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-[11px] text-[#4d7048]"
      >
        ✓
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums ${
        current ? 'bg-gild-deep text-white' : 'bg-parchment text-ink-soft'
      }`}
    >
      {index}
    </span>
  )
}
