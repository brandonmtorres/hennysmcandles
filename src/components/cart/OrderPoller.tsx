'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Waits for the order to appear on the confirmation page.
 *
 * The order is written by Square's webhook, which usually lands within a
 * second or two but is not guaranteed to beat the customer's redirect. Without
 * this, someone who arrives first sees a page that says only "payment
 * received" and never changes — the reassuring detail is one manual reload
 * away, and nothing on screen suggests reloading.
 *
 * So the page asks again a few times, then stops. Giving up quietly is
 * deliberate: the payment succeeded either way, and a page that retries
 * forever is a page that looks broken.
 */
const INTERVAL_MS = 2000
const MAX_ATTEMPTS = 12

export function OrderPoller() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) return
    const timer = window.setTimeout(() => {
      setAttempts((n) => n + 1)
      router.refresh()
    }, INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [attempts, router])

  const givenUp = attempts >= MAX_ATTEMPTS

  return (
    <p
      role="status"
      aria-live="polite"
      className="mx-auto mt-8 max-w-[42ch] text-[13px] leading-relaxed text-smoke"
    >
      {givenUp ? (
        'Your receipt is on its way by email. If it has not arrived in a few minutes, write to us and we will look it up.'
      ) : (
        <span className="inline-flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="block h-[5px] w-[5px] rotate-45 bg-gild motion-safe:animate-pulse"
          />
          Confirming the details with our studio…
        </span>
      )}
    </p>
  )
}
