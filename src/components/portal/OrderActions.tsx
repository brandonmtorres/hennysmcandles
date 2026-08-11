'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  markFulfilled,
  refundOrder,
  saveOrderNotes,
  type OrderActionState,
} from '@/app/store-portal/(app)/orders/actions'
import { Card, Field, Input, PortalButton, Select, Textarea } from '@/components/portal/ui'

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Royal Mail', 'Canada Post', 'Other']

export function OrderActions({
  order,
}: {
  order: {
    id: string
    status: string
    trackingNumber: string
    carrier: string
    internalNotes: string
    hasPaymentIntent: boolean
  }
}) {
  const [fulfilState, fulfilAction] = useActionState<OrderActionState, FormData>(
    markFulfilled,
    {},
  )
  const [refundState, refundAction] = useActionState<OrderActionState, FormData>(
    refundOrder,
    {},
  )
  const [notesState, notesAction] = useActionState<OrderActionState, FormData>(
    saveOrderNotes,
    {},
  )
  const [confirmingRefund, setConfirmingRefund] = useState(false)

  const shipped = order.status === 'FULFILLED'
  const refunded = order.status === 'REFUNDED'

  return (
    <>
      <Card
        title={shipped ? 'Shipping' : 'Pack and ship'}
        description={
          refunded
            ? 'This order was refunded.'
            : shipped
              ? 'Already marked as shipped. Updating the tracking number emails the customer again.'
              : 'Add a tracking number if you have one, then mark it shipped. The customer is emailed automatically.'
        }
      >
        <form action={fulfilAction} className="flex flex-col gap-5">
          <input type="hidden" name="orderId" value={order.id} />

          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field label="Tracking number" htmlFor="trackingNumber">
              <Input
                id="trackingNumber"
                name="trackingNumber"
                defaultValue={order.trackingNumber}
                maxLength={120}
                placeholder="Optional"
                disabled={refunded}
              />
            </Field>
            <Field label="Carrier" htmlFor="carrier">
              <Select
                id="carrier"
                name="carrier"
                defaultValue={order.carrier}
                disabled={refunded}
              >
                <option value="">Not set</option>
                {CARRIERS.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {fulfilState.error ? <Alert tone="bad">{fulfilState.error}</Alert> : null}
          {fulfilState.message ? <Alert tone="good">{fulfilState.message}</Alert> : null}

          <div>
            <FulfilButton shipped={shipped} disabled={refunded} />
          </div>
        </form>
      </Card>

      <Card title="Notes" description="Only you can see these.">
        <form action={notesAction} className="flex flex-col gap-4">
          <input type="hidden" name="orderId" value={order.id} />
          <Textarea
            name="internalNotes"
            defaultValue={order.internalNotes}
            rows={3}
            maxLength={2000}
            aria-label="Internal notes"
            placeholder="Gift wrap requested, customer asked for a note…"
          />
          {notesState.message ? <Alert tone="good">{notesState.message}</Alert> : null}
          <div>
            <NotesButton />
          </div>
        </form>
      </Card>

      {order.hasPaymentIntent && !refunded ? (
        <Card
          title="Refund"
          description="Refunds the full amount through Stripe and puts the stock back on the shelf."
        >
          {refundState.error ? <Alert tone="bad">{refundState.error}</Alert> : null}
          {refundState.message ? <Alert tone="good">{refundState.message}</Alert> : null}

          {!confirmingRefund ? (
            <PortalButton
              type="button"
              tone="danger"
              onClick={() => setConfirmingRefund(true)}
            >
              Refund this order
            </PortalButton>
          ) : (
            <form action={refundAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <p className="w-full text-[13.5px] text-ink">
                This refunds the full amount and cannot be undone. Continue?
              </p>
              <RefundButton />
              <PortalButton
                type="button"
                tone="ghost"
                onClick={() => setConfirmingRefund(false)}
              >
                Cancel
              </PortalButton>
            </form>
          )}
        </Card>
      ) : null}
    </>
  )
}

function Alert({ tone, children }: { tone: 'good' | 'bad'; children: React.ReactNode }) {
  const styles =
    tone === 'bad'
      ? 'border-danger/40 bg-danger/8 text-danger'
      : 'border-success/35 bg-success/10 text-[#4d7048]'
  return (
    <p role="status" className={`border px-4 py-2.5 text-[13px] ${styles}`}>
      {children}
    </p>
  )
}

function FulfilButton({ shipped, disabled }: { shipped: boolean; disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending || disabled}>
      {pending
        ? 'Saving…'
        : shipped
          ? 'Update tracking and re-send email'
          : 'Mark as shipped'}
    </PortalButton>
  )
}

function NotesButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="secondary" size="sm" disabled={pending}>
      {pending ? 'Saving…' : 'Save note'}
    </PortalButton>
  )
}

function RefundButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="danger" size="sm" disabled={pending}>
      {pending ? 'Refunding…' : 'Yes, refund'}
    </PortalButton>
  )
}
