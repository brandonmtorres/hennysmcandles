'use client'

import { useTransition } from 'react'
import { toggleCollectionSale } from '@/app/store-portal/(app)/collections/actions'
import { Badge } from '@/components/portal/ui'

/** Starts and stops a collection-wide promotion straight from the list. */
export function CollectionSaleToggle({
  id,
  name,
  active,
  percent,
}: {
  id: string
  name: string
  active: boolean
  percent: number
}) {
  const [pending, startTransition] = useTransition()

  if (percent <= 0) {
    return <span className="text-[12.5px] text-ink-soft">No promotion set</span>
  }

  return (
    <div className="flex items-center gap-2.5">
      {active ? <Badge tone="warn">{percent}% off</Badge> : null}
      <button
        type="button"
        disabled={pending}
        aria-label={`${active ? 'Stop' : 'Start'} the ${percent}% promotion on ${name}`}
        onClick={() =>
          startTransition(async () => {
            await toggleCollectionSale(id, !active)
          })
        }
        className="text-[12px] uppercase tracking-[0.14em] text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
      >
        {pending ? '…' : active ? 'Stop' : `Start ${percent}%`}
      </button>
    </div>
  )
}
