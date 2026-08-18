'use client'

import { useEffect } from 'react'
import { US_STATES } from '@/lib/us-states'

const STORAGE_KEY = 'hm-ship-state'

/**
 * Where the order is going.
 *
 * This exists because Square's hosted payment page collects the full address
 * only after the amount has been fixed, and tax depends on the destination —
 * so the state has to be known one step earlier than the address is. Asking
 * for one field rather than a whole address form keeps that cost small.
 *
 * The choice is remembered, so a returning customer answers it once.
 */
export function DestinationField({
  value,
  onChange,
  tabbable,
}: {
  value: string
  onChange: (state: string) => void
  tabbable: boolean
}) {
  // Restore the remembered state on first mount, without clobbering a choice
  // the customer has already made this visit.
  useEffect(() => {
    if (value) return
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) onChange(saved)
    } catch {
      // A browser with storage disabled simply asks every time.
    }
  }, [value, onChange])

  function handleChange(next: string) {
    onChange(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not being able to remember it is not worth failing the checkout over.
    }
  }

  return (
    <div className="mb-5 border-t border-wax/10 pt-5">
      <label htmlFor="ship-state" className="label-sm mb-2.5 block text-smoke">
        Shipping to
      </label>
      <div className="border-b border-wax/22 transition-colors focus-within:border-gild">
        <select
          id="ship-state"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          tabIndex={tabbable ? 0 : -1}
          className="h-10 w-full bg-transparent text-[13.5px] text-wax focus:outline-none [&>option]:bg-obsidian [&>option]:text-wax"
        >
          <option value="">Choose your state…</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-[11.5px] text-smoke">
        We ship within the United States only, for now.
      </p>
    </div>
  )
}
