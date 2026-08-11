'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { changePassword, type SecurityState } from '@/app/store-portal/(app)/security/actions'
import { Field, Input, PortalButton } from '@/components/portal/ui'

export function PasswordForm() {
  const [state, action] = useActionState<SecurityState, FormData>(changePassword, {})

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Current password" htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="New password"
        htmlFor="newPassword"
        hint="12 characters or more, with an upper case letter, a lower case letter, and a number."
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="border border-danger/40 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="border border-success/35 bg-success/10 px-4 py-2.5 text-[13px] text-[#4d7048]"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <Submit />
      </div>
    </form>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Updating…' : 'Change password'}
    </PortalButton>
  )
}
