'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  beginTotpSetup,
  confirmTotp,
  disableTotp,
  type SecurityState,
} from '@/app/store-portal/(app)/security/actions'
import { Badge, Card, Field, Input, PortalButton } from '@/components/portal/ui'

/**
 * Two-factor setup.
 *
 * The QR code is drawn client-side from the pairing URI so the shared secret
 * is never placed in an <img> URL, a server log, or a third-party chart API.
 */
export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const [confirmState, confirmAction] = useActionState<SecurityState, FormData>(
    confirmTotp,
    {},
  )
  const [disableState, disableAction] = useActionState<SecurityState, FormData>(
    disableTotp,
    {},
  )

  async function start() {
    setStarting(true)
    try {
      const result = await beginTotpSetup()
      setSetup(result)
      const QRCode = (await import('qrcode')).default
      setQr(
        await QRCode.toDataURL(result.uri, {
          margin: 1,
          width: 320,
          color: { dark: '#1c1c22', light: '#ffffff' },
        }),
      )
    } finally {
      setStarting(false)
    }
  }

  if (enabled && !confirmState.message) {
    return (
      <Card
        title="Two-factor authentication"
        description="A code from your phone is required alongside your password."
        actions={<Badge tone="good">On</Badge>}
      >
        <form action={disableAction} className="flex flex-col gap-4">
          <Field
            label="Confirm your password to turn it off"
            htmlFor="disable-password"
            hint="Turning this off makes the portal less secure."
          >
            <Input
              id="disable-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          {disableState.error ? (
            <p role="alert" className="text-[13px] text-danger">
              {disableState.error}
            </p>
          ) : null}
          {disableState.message ? (
            <p role="status" className="text-[13px] text-[#4d7048]">
              {disableState.message}
            </p>
          ) : null}

          <div>
            <DisableButton />
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card
      title="Two-factor authentication"
      description="Strongly recommended. Even if someone learns your password, they cannot get in without your phone."
      actions={
        enabled || confirmState.message ? (
          <Badge tone="good">On</Badge>
        ) : (
          <Badge tone="warn">Off</Badge>
        )
      }
    >
      {confirmState.message ? (
        <p
          role="status"
          className="border border-success/35 bg-success/10 px-4 py-2.5 text-[13px] text-[#4d7048]"
        >
          {confirmState.message}
        </p>
      ) : !setup ? (
        <div>
          <p className="mb-5 text-[13.5px] leading-relaxed text-ink-soft">
            You will need an authenticator app — Google Authenticator, 1Password, Authy,
            or the password manager you already use.
          </p>
          <PortalButton type="button" tone="gold" onClick={start} disabled={starting}>
            {starting ? 'Preparing…' : 'Set up two-factor'}
          </PortalButton>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <ol className="flex flex-col gap-5 text-[13.5px] leading-relaxed text-ink">
            <li>
              <strong className="font-normal text-ink">1.</strong> Scan this with your
              authenticator app.
              {qr ? (
                <img
                  src={qr}
                  alt="QR code for pairing your authenticator app"
                  width={180}
                  height={180}
                  className="mt-3 border border-rule"
                />
              ) : null}
            </li>
            <li>
              <strong className="font-normal text-ink">2.</strong> Or type this key in by
              hand:
              <code className="mt-2 block break-all border border-rule bg-parchment px-3 py-2 font-mono text-[12px] text-ink">
                {setup.secret}
              </code>
            </li>
          </ol>

          <form action={confirmAction} className="border-t border-rule pt-5">
            <Field
              label="3. Enter the six-digit code it shows"
              htmlFor="totp-code"
              error={confirmState.error}
            >
              <Input
                id="totp-code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="000000"
                className="max-w-[10rem] tracking-[0.3em]"
              />
            </Field>
            <div className="mt-4">
              <ConfirmButton />
            </div>
          </form>
        </div>
      )}
    </Card>
  )
}

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Checking…' : 'Turn on two-factor'}
    </PortalButton>
  )
}

function DisableButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="danger" disabled={pending}>
      {pending ? 'Turning off…' : 'Turn off two-factor'}
    </PortalButton>
  )
}
