'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  saveCampaign,
  sendTest,
  sendCampaign,
  deleteCampaign,
  type CampaignState,
} from '@/app/store-portal/(app)/newsletter/campaigns/actions'
import { Card, Field, Input, PortalButton, Textarea } from '@/components/portal/ui'

export type CampaignValues = {
  id: string | null
  subject: string
  preheader: string
  body: string
  ctaLabel: string
  ctaUrl: string
  status: string
  sentAt: string | null
  recipientCount: number
  failureCount: number
}

export function CampaignForm({
  values,
  audience,
}: {
  values: CampaignValues
  audience: number
}) {
  const save = saveCampaign.bind(null, values.id)
  const [state, action] = useActionState<CampaignState, FormData>(save, {})

  const [subject, setSubject] = useState(values.subject)
  const [body, setBody] = useState(values.body)
  const [ctaLabel, setCtaLabel] = useState(values.ctaLabel)
  const [ctaUrl, setCtaUrl] = useState(values.ctaUrl)

  const sent = values.status === 'SENT'
  const error = (key: string) => state.errors?.[key]

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <form action={action} className="flex flex-col gap-6">
        <Card
          title={sent ? 'What you sent' : 'Write it'}
          description={
            sent
              ? 'Already delivered, so this is kept as a record and cannot be changed.'
              : 'Plain writing. Leave a blank line between paragraphs.'
          }
        >
          <div className="flex flex-col gap-5">
            <Field label="Subject" htmlFor="subject" error={error('subject')}>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={160}
                disabled={sent}
                placeholder="A new pour: Midwinter"
              />
            </Field>

            <Field
              label="Preview line"
              htmlFor="preheader"
              hint="Most inboxes show this in grey beside the subject line."
            >
              <Input
                id="preheader"
                name="preheader"
                defaultValue={values.preheader}
                maxLength={160}
                disabled={sent}
              />
            </Field>

            <Field label="Message" htmlFor="body" error={error('body')}>
              <Textarea
                id="body"
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                required
                maxLength={20000}
                disabled={sent}
                placeholder={'Hello,\n\nThe midwinter batch is poured…'}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Button text" htmlFor="ctaLabel" hint="Leave blank for no button.">
                <Input
                  id="ctaLabel"
                  name="ctaLabel"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  maxLength={60}
                  disabled={sent}
                  placeholder="Shop the collection"
                />
              </Field>
              <Field label="Button link" htmlFor="ctaUrl" error={error('ctaUrl')}>
                <Input
                  id="ctaUrl"
                  name="ctaUrl"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  maxLength={300}
                  disabled={sent}
                  placeholder="https://hennysmcandles.com/products"
                />
              </Field>
            </div>
          </div>
        </Card>

        {state.error ? (
          <p role="alert" className="border border-danger/40 bg-danger/8 px-5 py-3 text-[13.5px] text-danger">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p role="status" className="border border-success/35 bg-success/10 px-5 py-3 text-[13.5px] text-[#4d7048]">
            {state.message}
          </p>
        ) : null}

        {!sent ? (
          <div className="flex flex-wrap items-center gap-3">
            <SaveButton isNew={!values.id} />
            <Link href="/store-portal/newsletter">
              <PortalButton type="button" tone="secondary">Cancel</PortalButton>
            </Link>
            {values.id ? (
              <PortalButton
                type="button"
                tone="ghost"
                className="ml-auto"
                onClick={() => deleteCampaign(values.id!)}
              >
                Delete draft
              </PortalButton>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className="flex flex-col gap-6">
        <Preview subject={subject} body={body} ctaLabel={ctaLabel} ctaUrl={ctaUrl} />
        {values.id ? (
          <SendPanel id={values.id} audience={audience} values={values} />
        ) : (
          <Card title="Sending">
            <p className="text-[13.5px] text-ink-soft">
              Save the draft first — then you can send yourself a test and, when it
              reads right, send it to the list.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

/** Roughly how the email will look, without leaving the page. */
function Preview({
  subject,
  body,
  ctaLabel,
  ctaUrl,
}: {
  subject: string
  body: string
  ctaLabel: string
  ctaUrl: string
}) {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <Card title="Preview" description="Close to what lands in an inbox.">
      <div className="border border-rule bg-white">
        <div className="bg-[#0b0b0f] px-6 py-7 text-center">
          <p className="font-[family-name:var(--font-display)] text-[19px] tracking-[0.14em] text-[#f2ead9]">
            HENNYS M.
          </p>
          <p className="mt-2 text-[7.5px] uppercase tracking-[0.36em] text-[#c8a15a]">
            Homemade Candles
          </p>
        </div>
        <div className="px-6 py-7">
          <p className="font-[family-name:var(--font-display)] text-[21px] leading-tight text-ink">
            {subject || 'Your subject line'}
          </p>
          {paragraphs.length === 0 ? (
            <p className="mt-4 text-[13.5px] italic text-ink-soft">
              Your message will appear here.
            </p>
          ) : (
            paragraphs.map((p, i) => (
              <p key={i} className="mt-3.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                {p}
              </p>
            ))
          )}
          {ctaLabel && ctaUrl ? (
            <span className="mt-5 inline-block bg-[#0b0b0f] px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f2ead9]">
              {ctaLabel}
            </span>
          ) : null}
          <p className="mt-6 border-t border-rule pt-4 text-[10.5px] leading-relaxed text-ink-soft">
            You are receiving this because you asked for notes from the studio.{' '}
            <span className="underline">Unsubscribe</span> at any time — one click, no
            questions.
          </p>
        </div>
      </div>
    </Card>
  )
}

function SendPanel({
  id,
  audience,
  values,
}: {
  id: string
  audience: number
  values: CampaignValues
}) {
  const [testState, testAction] = useActionState<CampaignState, FormData>(
    sendTest.bind(null, id),
    {},
  )
  const [sendState, sendAction] = useActionState<CampaignState, FormData>(
    sendCampaign.bind(null, id),
    {},
  )
  const [confirming, setConfirming] = useState(false)

  if (values.status === 'SENT') {
    return (
      <Card title="Sent">
        <p className="text-[14px] text-ink">
          Delivered to {values.recipientCount}{' '}
          {values.recipientCount === 1 ? 'person' : 'people'}
          {values.sentAt ? ` on ${values.sentAt}` : ''}.
        </p>
        {values.failureCount > 0 ? (
          <p className="mt-2 text-[13px] text-danger">
            {values.failureCount} could not be delivered.
          </p>
        ) : null}
      </Card>
    )
  }

  return (
    <Card
      title="Send"
      description={`${audience} ${audience === 1 ? 'person is' : 'people are'} on the list right now.`}
    >
      <form action={testAction}>
        <PortalButton type="submit" tone="secondary" className="w-full">
          Send a test to me
        </PortalButton>
      </form>
      {testState.message ? (
        <p role="status" className="mt-2.5 text-[12.5px] text-[#4d7048]">{testState.message}</p>
      ) : null}
      {testState.error ? (
        <p role="alert" className="mt-2.5 text-[12.5px] text-danger">{testState.error}</p>
      ) : null}

      <div className="mt-5 border-t border-rule pt-5">
        {!confirming ? (
          <PortalButton
            type="button"
            tone="primary"
            className="w-full"
            disabled={audience === 0}
            onClick={() => setConfirming(true)}
          >
            Send to the list
          </PortalButton>
        ) : (
          <form action={sendAction} className="flex flex-col gap-3">
            <p className="text-[13px] leading-relaxed text-ink">
              This goes to {audience} {audience === 1 ? 'person' : 'people'} and cannot
              be taken back. Send a test to yourself first if you have not.
            </p>
            <SendNowButton count={audience} />
            <PortalButton type="button" tone="ghost" onClick={() => setConfirming(false)}>
              Not yet
            </PortalButton>
          </form>
        )}
        {sendState.message ? (
          <p role="status" className="mt-3 text-[13px] text-[#4d7048]">{sendState.message}</p>
        ) : null}
        {sendState.error ? (
          <p role="alert" className="mt-3 text-[13px] text-danger">{sendState.error}</p>
        ) : null}
      </div>
    </Card>
  )
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Save draft' : 'Save changes'}
    </PortalButton>
  )
}

function SendNowButton({ count }: { count: number }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Sending…' : `Yes, send to ${count}`}
    </PortalButton>
  )
}
