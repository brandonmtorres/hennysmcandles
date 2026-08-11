'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveSettings, type SettingsState } from '@/app/store-portal/(app)/settings/actions'
import { Card, Field, Input, PortalButton, Textarea } from '@/components/portal/ui'

export function SettingsForm({
  values,
}: {
  values: {
    storeName: string
    storeEmail: string
    shippingFlat: string
    freeShippingThreshold: string
    taxPercent: number
    lowStockThreshold: number
    announcement: string
  }
}) {
  const [state, action] = useActionState<SettingsState, FormData>(saveSettings, {})
  const error = (key: string) => state.errors?.[key]

  return (
    <form action={action} className="flex flex-col gap-6">
      <Card title="Your store" description="Used on the site and in emails to customers.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Store name" htmlFor="storeName" error={error('storeName')}>
            <Input id="storeName" name="storeName" defaultValue={values.storeName} required />
          </Field>
          <Field
            label="Contact email"
            htmlFor="storeEmail"
            error={error('storeEmail')}
            hint="Where customer replies go."
          >
            <Input
              id="storeEmail"
              name="storeEmail"
              type="email"
              defaultValue={values.storeEmail}
              required
            />
          </Field>
          <Field
            label="Announcement bar"
            htmlFor="announcement"
            hint="The line across the very top of the shop. Leave blank to hide it."
            className="sm:col-span-2"
          >
            <Textarea
              id="announcement"
              name="announcement"
              defaultValue={values.announcement}
              rows={2}
              maxLength={200}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Shipping"
        description="Applied at checkout. Set the free-shipping threshold to 0 to always charge the flat rate."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Flat rate"
            htmlFor="shippingFlat"
            error={error('shippingFlatCents')}
            hint="Charged per order."
          >
            <Input
              id="shippingFlat"
              name="shippingFlat"
              defaultValue={values.shippingFlat}
              inputMode="decimal"
            />
          </Field>
          <Field
            label="Free shipping over"
            htmlFor="freeShippingThreshold"
            error={error('freeShippingThresholdCents')}
            hint="Order total that earns free delivery."
          >
            <Input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              defaultValue={values.freeShippingThreshold}
              inputMode="decimal"
            />
          </Field>
          <Field
            label="Tax rate (%)"
            htmlFor="taxPercent"
            error={error('taxPercent')}
            hint="Leave at 0 to let Stripe handle tax."
          >
            <Input
              id="taxPercent"
              name="taxPercent"
              type="number"
              step="0.1"
              min={0}
              max={30}
              defaultValue={values.taxPercent}
            />
          </Field>
        </div>
      </Card>

      <Card title="Alerts" description="When to warn you that a candle is running out.">
        <Field
          label="Low stock warning at"
          htmlFor="lowStockThreshold"
          error={error('lowStockThreshold')}
          hint="You get an email when a candle drops to this number or below after a sale."
          className="max-w-[16rem]"
        >
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={values.lowStockThreshold}
          />
        </Field>
      </Card>

      {state.message ? (
        <p
          role="status"
          className="border border-success/35 bg-success/10 px-5 py-3 text-[13.5px] text-[#4d7048]"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <SaveButton />
      </div>
    </form>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save settings'}
    </PortalButton>
  )
}
