'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  savePromoCode,
  deletePromoCode,
  type PromoFormState,
} from '@/app/store-portal/(app)/promo-codes/actions'
import { Card, Field, Input, PortalButton, Select } from '@/components/portal/ui'

export type PromoFormValues = {
  id: string | null
  code: string
  kind: string
  value: string
  minSubtotal: string
  maxRedemptions: number
  active: boolean
  note: string
  startsAt: string
  endsAt: string
  timesRedeemed: number
}

export function PromoForm({ values }: { values: PromoFormValues }) {
  const action = savePromoCode.bind(null, values.id)
  const [state, formAction] = useActionState<PromoFormState, FormData>(action, {})

  const [kind, setKind] = useState(values.kind)
  const [value, setValue] = useState(values.value)
  const [code, setCode] = useState(values.code)

  const error = (key: string) => state.errors?.[key]

  const preview =
    kind === 'FIXED'
      ? `$${(Number.parseFloat(value.replace(/[^0-9.]/g, '')) || 0).toFixed(2)} off the order`
      : `${Number.parseInt(value, 10) || 0}% off the order`

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card
        title="The code"
        description="Customers type this at checkout. It is not case-sensitive."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Code" htmlFor="code" error={error('code')}>
            <Input
              id="code"
              name="code"
              value={code}
              // Upper-cased as it is typed so what the owner sees is what is
              // stored, rather than being silently transformed on save.
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              required
              maxLength={40}
              placeholder="MIDWINTER15"
              className="font-mono tracking-[0.08em]"
            />
          </Field>

          <Field
            label="Note to yourself"
            htmlFor="note"
            hint="Only you see this."
          >
            <Input
              id="note"
              name="note"
              defaultValue={values.note}
              maxLength={200}
              placeholder="For the December newsletter"
            />
          </Field>
        </div>
      </Card>

      <Card title="The discount">
        <div className="grid gap-5 sm:grid-cols-[12rem_12rem_1fr] sm:items-end">
          <Field label="Type" htmlFor="kind">
            <Select
              id="kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="PERCENT">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
            </Select>
          </Field>

          <Field
            label={kind === 'FIXED' ? 'Amount' : 'Percentage'}
            htmlFor="value"
            error={error('value')}
          >
            <div className="flex items-center gap-2">
              {kind === 'FIXED' ? (
                <span className="text-[14px] text-ink-soft">$</span>
              ) : null}
              <Input
                id="value"
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                inputMode="decimal"
                placeholder={kind === 'FIXED' ? '10.00' : '15'}
              />
              {kind === 'PERCENT' ? (
                <span className="text-[14px] text-ink-soft">%</span>
              ) : null}
            </div>
          </Field>

          <p className="pb-2.5 text-[13.5px] text-ink-soft">
            Customers will see <strong className="text-ink">{preview}</strong>.
          </p>
        </div>

        <div className="mt-6 grid gap-5 border-t border-rule pt-6 sm:grid-cols-2">
          <Field
            label="Minimum spend"
            htmlFor="minSubtotal"
            hint="Leave at 0 for no minimum."
            error={error('minSubtotalCents')}
          >
            <Input
              id="minSubtotal"
              name="minSubtotal"
              defaultValue={values.minSubtotal}
              inputMode="decimal"
            />
          </Field>

          <Field
            label="Total uses allowed"
            htmlFor="maxRedemptions"
            hint={
              values.timesRedeemed > 0
                ? `Used ${values.timesRedeemed} time${values.timesRedeemed === 1 ? '' : 's'} so far. 0 means unlimited.`
                : '0 means unlimited.'
            }
            error={error('maxRedemptions')}
          >
            <Input
              id="maxRedemptions"
              name="maxRedemptions"
              type="number"
              min={0}
              defaultValue={values.maxRedemptions}
            />
          </Field>
        </div>
      </Card>

      <Card title="When it works">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" htmlFor="startsAt" hint="Leave blank to start now.">
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={values.startsAt}
            />
          </Field>
          <Field
            label="Ends"
            htmlFor="endsAt"
            hint="Leave blank for no end date."
            error={error('endsAt')}
          >
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={values.endsAt}
            />
          </Field>
        </div>

        <label className="mt-6 flex cursor-pointer items-center gap-3 border-t border-rule pt-6">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values.active}
            className="h-4 w-4 accent-[#9a7838]"
          />
          <span className="text-[14px] text-ink">This code is live</span>
        </label>
      </Card>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-rule bg-parchment/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <SaveButton isNew={!values.id} />
        <Link href="/store-portal/promo-codes">
          <PortalButton type="button" tone="secondary">
            Cancel
          </PortalButton>
        </Link>
        {values.id ? (
          <DeleteButton
            id={values.id}
            code={values.code}
            redeemed={values.timesRedeemed}
          />
        ) : null}
      </div>
    </form>
  )
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Create code' : 'Save changes'}
    </PortalButton>
  )
}

function DeleteButton({
  id,
  code,
  redeemed,
}: {
  id: string
  code: string
  redeemed: number
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <PortalButton
        type="button"
        tone="ghost"
        className="ml-auto"
        onClick={() => setConfirming(true)}
      >
        Delete
      </PortalButton>
    )
  }

  return (
    <span className="ml-auto flex items-center gap-3">
      <span className="text-[13px] text-ink-soft">
        {redeemed > 0
          ? `${code} has been used — it will be switched off, not deleted.`
          : `Delete ${code}?`}
      </span>
      <PortalButton type="button" tone="danger" size="sm" onClick={() => deletePromoCode(id)}>
        {redeemed > 0 ? 'Switch off' : 'Yes, delete'}
      </PortalButton>
      <PortalButton type="button" tone="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </PortalButton>
    </span>
  )
}
