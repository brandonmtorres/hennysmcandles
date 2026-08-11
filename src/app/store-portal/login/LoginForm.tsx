'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, verifyTotpCode, type LoginState } from '@/app/store-portal/login/actions'

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {})
  const [mfaState, mfaAction] = useActionState<LoginState, FormData>(verifyTotpCode, {})

  // Once the password step succeeds the form swaps to the code step. If the
  // code step reports the challenge expired, it swaps back.
  const onMfaStep = state.step === 'mfa' && mfaState.step !== 'password'

  if (onMfaStep) {
    return (
      <form action={mfaAction} className="flex flex-col gap-5">
        <div>
          <label htmlFor="code" className="label-sm mb-3 block text-smoke">
            Authentication code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className="h-13 w-full border border-wax/20 bg-transparent px-4 py-3 text-center text-[22px] tracking-[0.5em] text-wax transition-colors placeholder:text-smoke/35 focus:border-gild focus:outline-none"
          />
          <p className="mt-3 text-[12px] text-smoke">
            Open your authenticator app and enter the current six-digit code.
          </p>
        </div>

        {mfaState.error ? <ErrorNote>{mfaState.error}</ErrorNote> : null}
        <Submit idle="Verify" busy="Verifying…" />
      </form>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="email" className="label-sm mb-3 block text-smoke">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="h-12 w-full border border-wax/20 bg-transparent px-4 text-[15px] text-wax transition-colors focus:border-gild focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-sm mb-3 block text-smoke">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full border border-wax/20 bg-transparent px-4 text-[15px] text-wax transition-colors focus:border-gild focus:outline-none"
        />
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Submit idle="Sign in" busy="Signing in…" />
    </form>
  )
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="border border-danger/40 bg-danger/10 px-4 py-3 text-[13px] leading-snug text-danger"
    >
      {children}
    </p>
  )
}

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 h-12 w-full rounded-[2px] bg-wax text-[11px] uppercase tracking-[0.22em] text-obsidian transition-colors hover:bg-linen disabled:opacity-50"
    >
      {pending ? busy : idle}
    </button>
  )
}
