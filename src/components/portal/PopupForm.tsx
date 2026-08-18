'use client'

import { useActionState, useState } from 'react'
import { Card, Field, Input, PortalButton, Textarea } from '@/components/portal/ui'
import { CatSilhouette } from '@/components/visual/SeasonalMotifs'
import {
  savePopup,
  type PopupState,
} from '@/app/store-portal/(app)/newsletter/popup/actions'

export type PopupValues = {
  enabled: boolean
  discountPercent: number
  eyebrow: string
  headingLead: string
  headingTail: string
  body: string
  button: string
  welcomeCode: string
  delaySeconds: number
  scrollPercent: number
}

/**
 * The editor for the signup invitation.
 *
 * The preview beside it is the real thing — same wording, type and colours as
 * the shop — redrawn as each field is typed into. Copy written against an
 * accurate picture will not surprise anybody once it is live; the alternative
 * is saving, opening the shop and waiting eighteen seconds to discover that a
 * heading wrapped badly.
 */
export function PopupForm({ values }: { values: PopupValues }) {
  const [state, action] = useActionState<PopupState, FormData>(savePopup, {})
  const [draft, setDraft] = useState(values)

  const set = <K extends keyof PopupValues>(key: K, value: PopupValues[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const error = (key: string) => state.errors?.[key]

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <form action={action} className="flex flex-col gap-6">
        {state.message ? (
          <p
            role="status"
            className="border border-gild-deep/35 bg-gild-deep/8 px-5 py-3 text-[13.5px] text-ink"
          >
            {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p
            role="alert"
            className="border border-danger/40 bg-danger/8 px-5 py-3 text-[13.5px] text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <Card title="The invitation" description="What it says, and what it offers.">
          <div className="flex flex-col gap-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="enabled"
                checked={draft.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gild-deep"
              />
              <span>
                <span className="block text-[14px] text-ink">
                  Show the popup on the shop
                </span>
                <span className="mt-0.5 block text-[12.5px] text-ink-soft">
                  Switch it off and the footer signup carries on as normal.
                </span>
              </span>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Discount offered"
                htmlFor="discountPercent"
                hint="Shown in the heading and in the welcome email."
                error={error('discountPercent')}
              >
                <Input
                  id="discountPercent"
                  name="discountPercent"
                  type="number"
                  min={0}
                  max={90}
                  value={draft.discountPercent}
                  onChange={(e) => set('discountPercent', Number(e.target.value) || 0)}
                />
              </Field>

              <Field
                label="Welcome code"
                htmlFor="welcomeCode"
                hint="Emailed to each new subscriber. Blank sends no code."
                error={error('welcomeCode')}
              >
                <Input
                  id="welcomeCode"
                  name="welcomeCode"
                  value={draft.welcomeCode}
                  onChange={(e) => set('welcomeCode', e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
              </Field>
            </div>

            <Field
              label="Eyebrow"
              htmlFor="eyebrow"
              hint="The small line above the heading. Blank drops it."
              error={error('eyebrow')}
            >
              <Input
                id="eyebrow"
                name="eyebrow"
                value={draft.eyebrow}
                onChange={(e) => set('eyebrow', e.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Heading, before the offer"
                htmlFor="headingLead"
                error={error('headingLead')}
              >
                <Input
                  id="headingLead"
                  name="headingLead"
                  value={draft.headingLead}
                  onChange={(e) => set('headingLead', e.target.value)}
                />
              </Field>
              <Field
                label="Heading, after the offer"
                htmlFor="headingTail"
                error={error('headingTail')}
              >
                <Input
                  id="headingTail"
                  name="headingTail"
                  value={draft.headingTail}
                  onChange={(e) => set('headingTail', e.target.value)}
                />
              </Field>
            </div>

            <p className="-mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              The offer sits between the two, in the script face — reading{' '}
              <span className="text-ink">
                “{draft.headingLead} {draft.discountPercent}% off {draft.headingTail}”
              </span>
              .
            </p>

            <Field
              label="Body"
              htmlFor="body"
              hint="A sentence or two on what they are signing up for."
              error={error('body')}
            >
              <Textarea
                id="body"
                name="body"
                rows={3}
                value={draft.body}
                onChange={(e) => set('body', e.target.value)}
              />
            </Field>

            <Field label="Button" htmlFor="button" error={error('button')}>
              <Input
                id="button"
                name="button"
                value={draft.button}
                onChange={(e) => set('button', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="When it appears"
          description="Whichever comes first. Then it stays away for a fortnight."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="After reading for"
              htmlFor="delaySeconds"
              hint="Seconds. 0 switches this trigger off."
              error={error('delaySeconds')}
            >
              <Input
                id="delaySeconds"
                name="delaySeconds"
                type="number"
                min={0}
                max={300}
                value={draft.delaySeconds}
                onChange={(e) => set('delaySeconds', Number(e.target.value) || 0)}
              />
            </Field>
            <Field
              label="Or once scrolled past"
              htmlFor="scrollPercent"
              hint="Percent of the page. 0 switches this trigger off."
              error={error('scrollPercent')}
            >
              <Input
                id="scrollPercent"
                name="scrollPercent"
                type="number"
                min={0}
                max={100}
                value={draft.scrollPercent}
                onChange={(e) => set('scrollPercent', Number(e.target.value) || 0)}
              />
            </Field>
          </div>

          <p className="mt-5 border-t border-rule pt-5 text-[12.5px] leading-relaxed text-ink-soft">
            It also appears when the pointer heads for the tab bar, and it holds
            back while the footer signup is on screen — nobody is asked to join
            twice in one breath.
          </p>
        </Card>

        <div>
          <PortalButton type="submit" tone="primary">
            Save
          </PortalButton>
        </div>
      </form>

      <PopupPreview draft={draft} />
    </div>
  )
}

/** The shop's popup, drawn from the same wording and colours. */
function PopupPreview({ draft }: { draft: PopupValues }) {
  return (
    <div className="lg:sticky lg:top-6">
      <Card title="Preview" description="What a visitor sees.">
        <div className="-m-6 bg-[#151221] p-8">
          <div className="relative overflow-hidden border border-[#c8a15a]/25 bg-[#0d0b14] px-7 pb-8 pt-9 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(90% 60% at 50% 0%, rgba(200,161,90,0.16), transparent 68%)',
              }}
            />
            <span
              aria-hidden="true"
              className="absolute right-3 top-2.5 text-[13px] text-[#8d8798]"
            >
              ✕
            </span>

            <div className="relative">
              {draft.enabled ? null : (
                <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#c8503a]">
                  Switched off
                </p>
              )}

              {draft.eyebrow ? (
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#c8a15a]/90">
                  {draft.eyebrow}
                </p>
              ) : null}

              <p className="mt-4 font-[family-name:var(--font-display)] text-[25px] leading-[1.15] text-[#f2ece1]">
                {draft.headingLead}{' '}
                <span className="font-[family-name:var(--font-script)] text-[29px] text-[#c8a15a]">
                  {draft.discountPercent}% off
                </span>
                <br />
                {draft.headingTail}
              </p>

              <p className="mx-auto mt-4 max-w-[32ch] text-[12.5px] leading-relaxed text-[#8d8798]">
                {draft.body}
              </p>

              <p className="mt-7 border-b border-[#f2ece1]/25 pb-2.5 text-[12.5px] text-[#8d8798]/70">
                your@email.com
              </p>

              <p className="mt-6 bg-[#f2ece1] py-3.5 text-[10px] uppercase tracking-[0.22em] text-[#0d0b14]">
                {draft.button || 'Send me the code'}
              </p>

              <p className="mt-4 text-[11px] text-[#8d8798]/70">No thanks</p>
            </div>

            <CatSilhouette
              className="pointer-events-none absolute -bottom-1 left-3 h-8 w-8 opacity-30"
              style={{ color: '#c8a15a' }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
