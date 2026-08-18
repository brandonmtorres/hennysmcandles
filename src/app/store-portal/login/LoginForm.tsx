'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn, verifyTotpCode, type LoginState } from '@/app/store-portal/login/actions'

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {})
  const [mfaState, mfaAction] = useActionState<LoginState, FormData>(verifyTotpCode, {})

  // Off by default, and never remembered between visits: a password revealed
  // because of a choice made last week is a password shown to whoever is
  // standing there today.
  const [showPassword, setShowPassword] = useState(false)

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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            // Room on the right for the toggle, so a long password never runs
            // underneath it.
            className="h-12 w-full border border-wax/20 bg-transparent pl-4 pr-14 text-[15px] text-wax transition-colors focus:border-gild focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            // The button sits inside the field, so it must not be a submit and
            // must not take the label's name. Screen readers get the state
            // through aria-pressed rather than a changing label alone.
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-smoke transition-colors hover:text-wax focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gild"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <p className="mt-3 text-[12px] text-smoke">
          {showPassword
            ? 'Your password is visible — mind who is behind you.'
            : 'Reveal it if you need to check what you typed.'}
        </p>
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Submit idle="Sign in" busy="Signing in…" />
    </form>
  )
}

/* Hairline strokes to match the close control on the cart drawer, so the
   portal and the storefront look drawn by the same hand. */
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1 9s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.15" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1 9s3-5 8-5c1.2 0 2.3.3 3.2.7M17 9s-3 5-8 5c-1.2 0-2.3-.3-3.2-.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 2.5l13 13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
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
