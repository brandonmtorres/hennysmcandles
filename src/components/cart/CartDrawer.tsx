'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { formatMoney } from '@/lib/money'

export function CartDrawer({
  freeShippingThresholdCents,
}: {
  freeShippingThresholdCents: number
}) {
  const { lines, isOpen, close, setQuantity, remove, subtotalCents, count } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Move focus into the drawer when it opens so keyboard users land inside it.
  useEffect(() => {
    if (isOpen) {
      setError(null)
      const timer = window.setTimeout(() => closeRef.current?.focus(), 80)
      return () => window.clearTimeout(timer)
    }
  }, [isOpen])

  // Trap Tab within the drawer while it is open.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const remaining = Math.max(0, freeShippingThresholdCents - subtotalCents)
  const progress =
    freeShippingThresholdCents > 0
      ? Math.min(100, (subtotalCents / freeShippingThresholdCents) * 100)
      : 100

  async function checkout() {
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only identifiers and quantities are sent. The server prices the order.
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      })

      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Checkout is unavailable right now. Please try again.')
        setSubmitting(false)
        return
      }
      window.location.assign(payload.url)
    } catch {
      setError('We could not reach the checkout. Check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className={['fixed inset-0 z-[70]', isOpen ? '' : 'pointer-events-none'].join(' ')}
      aria-hidden={!isOpen}
    >
      <div
        onClick={close}
        className={[
          'absolute inset-0 bg-pitch/80 backdrop-blur-sm transition-opacity duration-600',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className={[
          'absolute right-0 top-0 flex h-full w-full max-w-[26.5rem] flex-col border-l border-wax/10 bg-obsidian',
          'transition-transform duration-600 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-wax/10 px-6 py-5">
          <h2 className="label text-wax">
            Your cart{count > 0 ? <span className="text-gild"> · {count}</span> : null}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="-mr-2 flex h-10 w-10 items-center justify-center text-moon transition-colors hover:text-wax"
            aria-label="Close cart"
            tabIndex={isOpen ? 0 : -1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="text-3xl" aria-hidden="true">
              ☾
            </span>
            <p className="display-sm text-wax">Nothing here yet</p>
            <p className="max-w-[24ch] text-sm leading-relaxed text-smoke">
              Every candle is poured, set with its crystal and finished by hand.
            </p>
            <ButtonLink
              href="/products"
              variant="outline"
              size="sm"
              onClick={close}
              tabIndex={isOpen ? 0 : -1}
              className="mt-2"
            >
              Explore the collection
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-wax/8 overflow-y-auto px-6">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-4 py-5">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={close}
                    tabIndex={isOpen ? 0 : -1}
                    className="relative h-24 w-20 shrink-0 overflow-hidden bg-ash"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${line.slug}`}
                      onClick={close}
                      tabIndex={isOpen ? 0 : -1}
                      className="font-[family-name:var(--font-display)] text-[17px] leading-tight text-wax transition-colors hover:text-gild"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1 text-[12.5px] text-smoke">
                      {formatMoney(line.priceCents)} each
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <div className="flex items-center border border-wax/15">
                        <Stepper
                          label={`Decrease quantity of ${line.name}`}
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          disabled={!isOpen}
                        >
                          −
                        </Stepper>
                        <span className="w-8 text-center text-[13px] tabular-nums text-wax">
                          {line.quantity}
                        </span>
                        <Stepper
                          label={`Increase quantity of ${line.name}`}
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={!isOpen || line.quantity >= line.maxStock}
                        >
                          +
                        </Stepper>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        tabIndex={isOpen ? 0 : -1}
                        className="label-sm text-smoke underline decoration-transparent underline-offset-4 transition-colors hover:text-danger hover:decoration-current"
                      >
                        Remove
                      </button>
                    </div>

                    {line.quantity >= line.maxStock ? (
                      <p className="mt-2 text-[11px] text-gild/80">
                        Only {line.maxStock} left
                      </p>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-[13px] tabular-nums text-wax">
                    {formatMoney(line.priceCents * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <footer className="border-t border-wax/10 px-6 pb-7 pt-5">
              {freeShippingThresholdCents > 0 ? (
                <div className="mb-5">
                  <p className="label-sm mb-2 text-smoke">
                    {remaining === 0 ? (
                      <span className="text-gild">Shipping is on us</span>
                    ) : (
                      <>
                        {formatMoney(remaining)} more for free shipping
                      </>
                    )}
                  </p>
                  <div
                    className="h-px w-full bg-wax/12"
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress toward free shipping"
                  >
                    <div
                      className="h-px bg-gild transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between">
                <span className="label text-smoke">Subtotal</span>
                <span className="font-[family-name:var(--font-display)] text-2xl tabular-nums text-wax">
                  {formatMoney(subtotalCents)}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] text-smoke">
                Shipping and taxes are calculated at checkout.
              </p>

              {error ? (
                <p
                  role="alert"
                  className="mt-4 border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12.5px] leading-snug text-danger"
                >
                  {error}
                </p>
              ) : null}

              <Button
                onClick={checkout}
                disabled={submitting || lines.length === 0}
                tabIndex={isOpen ? 0 : -1}
                className="mt-5 w-full"
                size="lg"
              >
                {submitting ? 'Taking you to checkout…' : 'Checkout'}
              </Button>

              <p className="label-sm mt-4 text-center text-smoke/70">
                Secure payment via Stripe
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function Stepper({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center text-[15px] leading-none text-moon transition-colors hover:text-wax disabled:opacity-30 disabled:hover:text-moon"
    >
      {children}
    </button>
  )
}
