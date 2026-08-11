'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function ContactForm() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return

    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    setState('sending')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json()) as { error?: string }
      if (response.ok) {
        setState('sent')
        form.reset()
      } else {
        setState('error')
        setMessage(payload.error ?? 'That did not send. Please try again.')
      }
    } catch {
      setState('error')
      setMessage('We could not reach the server. Check your connection and try again.')
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="border border-gild/30 bg-gild/5 px-8 py-12 text-center">
        <span className="block text-3xl" aria-hidden="true">
          ☾
        </span>
        <p className="display-sm mt-5 text-wax">Message sent</p>
        <p className="mx-auto mt-3 max-w-[34ch] text-[14.5px] leading-relaxed text-smoke">
          Hennys will get back to you within a day or two. Thank you for writing.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="label-sm mt-7 text-gild underline underline-offset-[6px] transition-opacity hover:opacity-70"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {/* Honeypot — bots fill this, people never see it. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="name" label="Your name" required autoComplete="name" />
      <Field id="email" label="Email" type="email" required autoComplete="email" />
      <Field id="subject" label="Subject" />

      <div>
        <label htmlFor="message" className="label-sm mb-3 block text-smoke">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          className="w-full resize-y border border-wax/18 bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-wax transition-colors placeholder:text-smoke/50 focus:border-gild focus:outline-none"
          placeholder="Tell Hennys what you need…"
        />
      </div>

      {state === 'error' ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 px-4 py-3 text-[13.5px] text-danger"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={state === 'sending'} className="self-start">
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}

function Field({
  id,
  label,
  type = 'text',
  required = false,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="label-sm mb-3 block text-smoke">
        {label}
        {required ? <span className="text-gild"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={200}
        className="h-12 w-full border border-wax/18 bg-transparent px-4 text-[15px] text-wax transition-colors placeholder:text-smoke/50 focus:border-gild focus:outline-none"
      />
    </div>
  )
}
