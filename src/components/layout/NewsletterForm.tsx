'use client'

import { useState } from 'react'
import { markJoined } from '@/lib/newsletter-prefs'

export function NewsletterForm({ discountPercent }: { discountPercent: number }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      })
      const payload = (await response.json()) as { message?: string; error?: string }
      if (response.ok) {
        setState('done')
        setMessage(payload.message ?? 'You are on the list.')
        // Recorded so the popup never asks somebody who has just signed up here.
        markJoined()
      } else {
        setState('error')
        setMessage(payload.error ?? 'That did not work. Try again.')
      }
    } catch {
      setState('error')
      setMessage('We could not reach the server. Check your connection.')
    }
  }

  if (state === 'done') {
    return (
      <p role="status" data-newsletter-inline="" className="text-[13.5px] leading-relaxed text-gild">
        {message} Look out for your {discountPercent}% code.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate data-newsletter-inline="">
      <label htmlFor="newsletter-email" className="label-sm mb-3 block text-smoke">
        {discountPercent}% off your first order
      </label>
      <div className="flex items-stretch border-b border-wax/22 transition-colors focus-within:border-gild">
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (state === 'error') setState('idle')
          }}
          placeholder="your@email.com"
          aria-describedby={state === 'error' ? 'newsletter-error' : undefined}
          aria-invalid={state === 'error'}
          className="h-11 w-full min-w-0 bg-transparent text-[14px] text-wax placeholder:text-smoke/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="label-sm shrink-0 pl-4 text-gild transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          {state === 'sending' ? 'Joining…' : 'Join'}
        </button>
      </div>
      {state === 'error' ? (
        <p id="newsletter-error" role="alert" className="mt-2.5 text-[12px] text-danger">
          {message}
        </p>
      ) : null}
    </form>
  )
}
