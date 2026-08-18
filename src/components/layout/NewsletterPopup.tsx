'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CatSilhouette } from '@/components/visual/SeasonalMotifs'
import { markDismissed, markJoined, shouldStayQuiet } from '@/lib/newsletter-prefs'
import { ScriptText } from '@/components/brand/ScriptText'

/**
 * The signup invitation.
 *
 * Popups are easy to get wrong, so the rules here are deliberate:
 *
 *  · It waits — for a delay, a scroll, or the pointer leaving toward the tab
 *    bar. It never appears the instant the page loads.
 *  · A dismissal is remembered for a fortnight, and joining is remembered for
 *    good. Nobody is asked twice in one visit, or nagged across visits.
 *  · It holds off while the footer signup is on screen. Scrolling down far
 *    enough to reach that form is exactly what trips the scroll trigger, so
 *    without this the popup covers the very field the visitor was reaching for
 *    and asks them the question they were already answering.
 *  · Escape closes it, focus is trapped inside while it is open and restored
 *    to wherever it was when it closes.
 *  · It stays out of the way on the portal, the checkout, and the unsubscribe
 *    page — being invited to join a list you are in the middle of leaving is
 *    the sort of thing that gets a sender marked as spam.
 */

/** Routes where an invitation would be unwelcome or absurd. */
const SUPPRESSED = ['/store-portal', '/checkout', '/unsubscribe']

export type PopupCopy = {
  enabled: boolean
  discountPercent: number
  eyebrow: string
  headingLead: string
  headingTail: string
  body: string
  button: string
  delaySeconds: number
  scrollPercent: number
}

export function NewsletterPopup({ copy }: { copy: PopupCopy }) {
  const discountPercent = copy.discountPercent
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  const suppressed = !copy.enabled || SUPPRESSED.some((p) => pathname.startsWith(p))

  const close = useCallback(() => {
    setOpen(false)
    markDismissed()
    restoreFocusTo.current?.focus?.()
  }, [])

  // --- Decide whether to arm the triggers at all -----------------------------
  useEffect(() => {
    if (suppressed) return
    if (shouldStayQuiet()) return

    let fired = false

    // Asked at the moment of firing rather than tracked in the background: an
    // observer reports asynchronously, so a quick scroll to the footer can
    // reach the trigger before the callback says the form is on screen, and the
    // popup opens over it anyway. Measuring here cannot lose that race.
    const inlineFormOnScreen = () => {
      const margin = 80
      return [...document.querySelectorAll('[data-newsletter-inline]')].some((form) => {
        const box = form.getBoundingClientRect()
        return box.bottom > -margin && box.top < window.innerHeight + margin
      })
    }

    const show = () => {
      if (fired || inlineFormOnScreen()) return
      fired = true
      restoreFocusTo.current = document.activeElement as HTMLElement
      setOpen(true)
    }

    const timer =
      copy.delaySeconds > 0 ? window.setTimeout(show, copy.delaySeconds * 1000) : 0

    // The scroll trigger waits for the scrolling to stop.
    //
    // Firing on the first frame past the threshold means interrupting somebody
    // mid-movement, and it misjudges where they were going: a jump to the
    // footer passes 35% while the footer is still far below the fold, so the
    // check above sees no signup form and opens over the one they are on their
    // way to. Settling first asks the question once they have arrived.
    let settle = 0
    const onScroll = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const scrolled =
          window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)
        if (scrolled * 100 > copy.scrollPercent) show()
      }, 500)
    }

    // Pointer heading for the tab bar reads as "about to leave".
    const onLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) show()
    }

    if (copy.scrollPercent > 0) {
      window.addEventListener('scroll', onScroll, { passive: true })
    }
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(settle)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [suppressed, pathname, copy.delaySeconds, copy.scrollPercent])

  // --- Focus, Escape and scroll lock ----------------------------------------
  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)

    // Hiding the overflow takes the scrollbar away with it, and the page jumps
    // sideways by its width as the content re-centres. Holding that width back
    // as padding keeps everything exactly where it was.
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])',
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
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'popup' }),
      })
      const payload = (await response.json()) as { message?: string; error?: string }
      if (response.ok) {
        setState('done')
        setMessage(payload.message ?? 'You are on the list.')
        markJoined()
        window.setTimeout(() => setOpen(false), 3200)
      } else {
        setState('error')
        setMessage(payload.error ?? 'That did not work. Try again.')
      }
    } catch {
      setState('error')
      setMessage('We could not reach the server. Check your connection.')
    }
  }

  if (suppressed || !open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <div
        onClick={close}
        aria-hidden="true"
        className="absolute inset-0 bg-pitch/70 backdrop-blur-sm"
        style={{ animation: 'rise 500ms cubic-bezier(0.22,0.61,0.36,1) both' }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-heading"
        className="relative w-full max-w-md overflow-hidden border border-gild/25 bg-obsidian px-7 pb-8 pt-9 sm:px-9 sm:pb-10 sm:pt-11"
        style={{
          animation: 'rise 620ms cubic-bezier(0.22,0.61,0.36,1) both',
          animationDelay: '80ms',
        }}
      >
        {/* A pool of candlelight behind the offer. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 60% at 50% 0%, rgba(200,161,90,0.16), transparent 68%)',
          }}
        />

        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center text-smoke transition-colors hover:text-wax"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.1" />
          </svg>
        </button>

        <div className="relative text-center">
          {state === 'done' ? (
            <>
              <span className="block text-3xl" aria-hidden="true">
                ☾
              </span>
              <p
                id="newsletter-popup-heading"
                className="display-sm mt-5 text-wax"
                role="status"
              >
                {message}
              </p>
              <p className="mx-auto mt-3 max-w-[30ch] text-[14px] leading-relaxed text-smoke">
                Check your inbox — your {discountPercent}% code is on its way.
              </p>
            </>
          ) : (
            <>
              {copy.eyebrow ? (
                <p className="label text-gild/90">{copy.eyebrow}</p>
              ) : null}

              <h2 id="newsletter-popup-heading" className="display-sm mt-4 text-wax">
                {copy.headingLead}{' '}
                <ScriptText className="text-gild">{discountPercent}% off</ScriptText>
                <br />
                {copy.headingTail}
              </h2>

              <p className="mx-auto mt-4 max-w-[32ch] text-[14px] leading-relaxed text-smoke">
                {copy.body}
              </p>

              <form onSubmit={onSubmit} noValidate className="mt-7">
                <label htmlFor="popup-email" className="sr-only">
                  Email address
                </label>
                <div className="flex items-stretch border-b border-wax/25 transition-colors focus-within:border-gild">
                  <input
                    ref={inputRef}
                    id="popup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (state === 'error') setState('idle')
                    }}
                    placeholder="your@email.com"
                    aria-invalid={state === 'error'}
                    aria-describedby={state === 'error' ? 'popup-error' : undefined}
                    className="h-11 w-full min-w-0 bg-transparent text-center text-[14.5px] text-wax placeholder:text-smoke/55 focus:outline-none"
                  />
                </div>

                {state === 'error' ? (
                  <p id="popup-error" role="alert" className="mt-3 text-[12.5px] text-danger">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={state === 'sending'}
                  className="mt-6 h-12 w-full rounded-[2px] bg-wax text-[11px] uppercase tracking-[0.22em] text-obsidian transition-colors hover:bg-linen disabled:opacity-50"
                >
                  {state === 'sending' ? 'Joining…' : copy.button}
                </button>
              </form>

              <button
                type="button"
                onClick={close}
                className="mt-4 text-[12px] text-smoke/70 underline decoration-transparent underline-offset-4 transition-colors hover:text-smoke hover:decoration-current"
              >
                No thanks
              </button>
            </>
          )}
        </div>

        {/* The cat, keeping an eye on things. */}
        <CatSilhouette
          className="pointer-events-none absolute -bottom-1 left-3 h-9 w-9 select-none opacity-30"
          style={{ color: '#c8a15a' }}
        />
      </div>
    </div>
  )
}
