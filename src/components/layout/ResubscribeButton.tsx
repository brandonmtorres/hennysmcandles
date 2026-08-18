'use client'

import { useState } from 'react'

/** A way back, in case the unsubscribe click was a mistake. */
export function ResubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  if (state === 'done') {
    return (
      <p role="status" className="label-sm text-gild">
        You are back on the list.
      </p>
    )
  }

  return (
    <button
      type="button"
      disabled={state === 'working'}
      onClick={async () => {
        setState('working')
        try {
          const response = await fetch('/api/newsletter/resubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          setState(response.ok ? 'done' : 'error')
        } catch {
          setState('error')
        }
      }}
      className="label-sm text-smoke underline decoration-wax/25 underline-offset-[6px] transition-colors hover:text-wax disabled:opacity-50"
    >
      {state === 'working'
        ? 'One moment…'
        : state === 'error'
          ? 'That did not work — try again'
          : 'Actually, put me back on'}
    </button>
  )
}
