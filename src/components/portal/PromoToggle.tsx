'use client'

import { useTransition } from 'react'
import { togglePromoCode } from '@/app/store-portal/(app)/promo-codes/actions'

/** Switches a code on or off straight from the list. */
export function PromoToggle({
  id,
  code,
  active,
}: {
  id: string
  code: string
  active: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${active ? 'Switch off' : 'Switch on'} ${code}`}
      onClick={() =>
        startTransition(async () => {
          await togglePromoCode(id, !active)
        })
      }
      className="text-[12px] uppercase tracking-[0.14em] text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
    >
      {pending ? '…' : active ? 'Off' : 'On'}
    </button>
  )
}
