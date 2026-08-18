'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  addSubscriber,
  type SubscriberActionState,
} from '@/app/store-portal/(app)/newsletter/actions'
import { PortalButton } from '@/components/portal/ui'

/** Adds somebody by hand — a market signup, a friend, a phone order. */
export function AddSubscriber() {
  const [state, action] = useActionState<SubscriberActionState, FormData>(
    addSubscriber,
    {},
  )

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="min-w-[15rem] flex-1">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
          Add someone
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="their@email.com"
          className="h-10 w-full border border-rule bg-surface px-3 text-[14px] text-ink placeholder:text-ink-soft/55 focus:border-gild-deep focus:outline-none"
        />
      </label>
      <label className="min-w-[11rem]">
        <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
          Name (optional)
        </span>
        <input
          name="name"
          maxLength={120}
          className="h-10 w-full border border-rule bg-surface px-3 text-[14px] text-ink focus:border-gild-deep focus:outline-none"
        />
      </label>
      <Submit />
      {state.error ? (
        <p role="alert" className="w-full text-[12.5px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="w-full text-[12.5px] text-[#4d7048]">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="secondary" disabled={pending}>
      {pending ? 'Adding…' : 'Add'}
    </PortalButton>
  )
}
