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
import { formatMoney } from '@/lib/money'
import { CARRIER_NAMES } from '@/lib/carriers'

/**
 * The carriers we can build a tracking link for, plus an escape hatch.
 *
 * Taken from the shared list rather than typed out again, so a carrier added
 * there gains a working link here without anyone remembering to. "Other" earns
 * its place — the number is still worth recording even when we cannot link it.
 */
const CARRIERS = [...CARRIER_NAMES, 'Other']

export function OrderActions({
  order,
}: {
  order: {
    id: string
    status: string
    trackingNumber: string
    carrier: string
    internalNotes: string
    hasPayment: boolean
    totalCents: number
    refundedCents: number
    currency: string
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
  const remainingCents = order.totalCents - order.refundedCents

  return (
    <>
      <Card
        title={shipped ? 'Shipping' : 'Send it'}
        description={
          refunded
            ? 'This order was refunded.'
            : shipped
              ? 'Already marked as shipped. Updating the tracking number emails the customer again with the new one.'
              : 'Enter the tracking number from your postage label, then mark it shipped. That is what emails the customer — nothing goes out before you press it.'
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

      {order.hasPayment && !refunded ? (
        <Card
          title="Refund"
          description={
            order.refundedCents > 0
              ? `${formatMoney(order.refundedCents, order.currency)} has already been refunded on this order. ${formatMoney(remainingCents, order.currency)} is still refundable.`
              : 'Refunds through Square. A full refund puts the stock back on the shelf; a partial one leaves it alone, since usually nothing is coming back.'
          }
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
            <form action={refundAction} className="flex flex-col gap-4">
              <input type="hidden" name="orderId" value={order.id} />

              <Field
                label="Amount"
                htmlFor="refundAmount"
                hint={`Leave blank to refund the whole ${formatMoney(remainingCents, order.currency)}.`}
              >
                <Input
                  id="refundAmount"
                  name="amount"
                  inputMode="decimal"
                  maxLength={12}
                  placeholder={(remainingCents / 100).toFixed(2)}
                />
              </Field>

              <p className="text-[13.5px] text-ink">This cannot be undone. Continue?</p>

              <div className="flex flex-wrap items-center gap-3">
                <RefundButton />
                <PortalButton
                  type="button"
                  tone="ghost"
                  onClick={() => setConfirmingRefund(false)}
                >
                  Cancel
                </PortalButton>
              </div>
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
