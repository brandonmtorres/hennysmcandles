'use client'

import { useState, useTransition } from 'react'
import {
  removeSubscriber,
  restoreSubscriber,
  deleteSubscriber,
} from '@/app/store-portal/(app)/newsletter/actions'
import { Badge } from '@/components/portal/ui'

type Row = {
  id: string
  email: string
  name: string | null
  status: string
  source: string
  subscribedAt: string
  unsubscribedAt: string | null
}

export function SubscriberRow({ subscriber }: { subscriber: Row }) {
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const on = subscriber.status === 'SUBSCRIBED'

  return (
    <li className="px-6 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-center sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[14px] text-ink">{subscriber.email}</p>
          {subscriber.name ? (
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">{subscriber.name}</p>
          ) : null}
        </div>

        <span className="text-[12.5px] text-ink-soft">{subscriber.source}</span>

        <span className="text-[12.5px] text-ink-soft">
          {on ? subscriber.subscribedAt : `Left ${subscriber.unsubscribedAt ?? ''}`}
        </span>

        <div className="flex items-center gap-3 sm:justify-end">
          {on ? null : <Badge tone="neutral">Off</Badge>}

          {confirmingDelete ? (
            <>
              <span className="text-[12px] text-ink-soft">Erase permanently?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { await deleteSubscriber(subscriber.id) })}
                className="text-[12px] uppercase tracking-[0.14em] text-danger underline underline-offset-4 disabled:opacity-40"
              >
                Erase
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-[12px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (on) await removeSubscriber(subscriber.id)
                    else await restoreSubscriber(subscriber.id)
                  })
                }
                aria-label={`${on ? 'Unsubscribe' : 'Put back'} ${subscriber.email}`}
                className="text-[12px] uppercase tracking-[0.14em] text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-ink disabled:opacity-40"
              >
                {pending ? '…' : on ? 'Unsubscribe' : 'Put back'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Erase ${subscriber.email} permanently`}
                className="text-[12px] uppercase tracking-[0.14em] text-ink-soft/70 transition-colors hover:text-danger"
              >
                Erase
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
