'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  resetEmailTemplate,
  saveEmailTemplate,
  sendTestEmail,
  type EmailState,
} from '@/app/store-portal/(app)/emails/actions'
import { Card, Field, Input, PortalButton, Textarea } from '@/components/portal/ui'
import { EMAIL_TOKENS } from '@/lib/email/copy'

export type EmailTemplateValues = {
  key: 'order_confirmation' | 'shipping_notice'
  subject: string
  heading: string
  intro: string
  outro: string
}

export function EmailTemplateForm({
  title,
  description,
  sentWhen,
  values,
}: {
  title: string
  description: string
  /** Plain statement of what makes this email go out. */
  sentWhen: string
  values: EmailTemplateValues
}) {
  const [saveState, saveAction] = useActionState<EmailState, FormData>(
    saveEmailTemplate,
    {},
  )
  const [resetState, resetAction] = useActionState<EmailState, FormData>(
    resetEmailTemplate,
    {},
  )
  const [testState, testAction] = useActionState<EmailState, FormData>(sendTestEmail, {})

  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  // Re-render the preview whenever the saved copy changes underneath, so a
  // save and a reset both land in the pane without a manual refresh.
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setRevision((n) => n + 1)
  }, [values.subject, values.heading, values.intro, values.outro])

  async function renderPreview() {
    const form = formRef.current
    if (!form) return
    setPreviewing(true)
    try {
      const data = new FormData(form)
      const response = await fetch('/api/portal/email-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: values.key,
          subject: String(data.get('subject') ?? ''),
          heading: String(data.get('heading') ?? ''),
          intro: String(data.get('intro') ?? ''),
          outro: String(data.get('outro') ?? ''),
        }),
      })
      const payload = (await response.json()) as { html?: string; subject?: string }
      if (payload.html) {
        setPreview(payload.html)
        setPreviewSubject(payload.subject ?? null)
      }
    } catch {
      setPreview(null)
    } finally {
      setPreviewing(false)
    }
  }

  // Show a preview on first paint so the pane is never an empty box.
  useEffect(() => {
    void renderPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])

  return (
    <Card title={title} description={description}>
      <p className="-mt-1 mb-6 border-l-2 border-gild-deep/40 pl-4 text-[13px] leading-relaxed text-ink-soft">
        {sentWhen}
      </p>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form ref={formRef} action={saveAction} className="flex flex-col gap-5">
          <input type="hidden" name="key" value={values.key} />

          <Field label="Subject line" htmlFor={`${values.key}-subject`}>
            <Input
              id={`${values.key}-subject`}
              name="subject"
              defaultValue={values.subject}
              maxLength={200}
              onChange={() => setPreview(preview)}
            />
          </Field>

          <Field label="Heading" htmlFor={`${values.key}-heading`}>
            <Input
              id={`${values.key}-heading`}
              name="heading"
              defaultValue={values.heading}
              maxLength={200}
            />
          </Field>

          <Field
            label="Opening"
            htmlFor={`${values.key}-intro`}
            hint="Leave a blank line between paragraphs."
          >
            <Textarea
              id={`${values.key}-intro`}
              name="intro"
              defaultValue={values.intro}
              rows={7}
              maxLength={4000}
            />
          </Field>

          <Field
            label="Closing note"
            htmlFor={`${values.key}-outro`}
            hint="Sits in smaller type under the order summary. May be left empty."
          >
            <Textarea
              id={`${values.key}-outro`}
              name="outro"
              defaultValue={values.outro}
              rows={4}
              maxLength={2000}
            />
          </Field>

          <TokenLegend />

          {saveState.error ? <Alert tone="bad">{saveState.error}</Alert> : null}
          {saveState.message ? <Alert tone="good">{saveState.message}</Alert> : null}
          {testState.error ? <Alert tone="bad">{testState.error}</Alert> : null}
          {testState.message ? <Alert tone="good">{testState.message}</Alert> : null}
          {resetState.message ? <Alert tone="good">{resetState.message}</Alert> : null}

          <div className="flex flex-wrap items-center gap-3">
            <SaveButton />
            <PortalButton
              type="button"
              tone="secondary"
              size="sm"
              onClick={() => void renderPreview()}
              disabled={previewing}
            >
              {previewing ? 'Rendering…' : 'Refresh preview'}
            </PortalButton>
            <PortalButton type="submit" tone="ghost" size="sm" formAction={testAction}>
              Send me a test
            </PortalButton>
            <PortalButton type="submit" tone="ghost" size="sm" formAction={resetAction}>
              Reset wording
            </PortalButton>
          </div>
        </form>

        <div>
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              Preview
            </span>
            <span className="truncate text-[12px] text-ink-soft" title={previewSubject ?? ''}>
              {previewSubject}
            </span>
          </div>
          {/* Sandboxed: the preview is our own HTML, but an email body is the
              last place to hand a page script access to the portal. */}
          <iframe
            title={`${title} preview`}
            sandbox=""
            srcDoc={preview ?? '<p style="font-family:sans-serif;padding:20px;color:#6b6b73">Rendering…</p>'}
            className="h-[34rem] w-full border border-rule bg-white"
          />
        </div>
      </div>
    </Card>
  )
}

function TokenLegend() {
  return (
    <details className="border border-rule bg-parchment/60 px-4 py-3">
      <summary className="cursor-pointer text-[12.5px] text-ink">
        Words that fill themselves in
      </summary>
      <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {EMAIL_TOKENS.map((t) => (
          <div key={t.token} className="flex items-baseline gap-2">
            <dt className="shrink-0 font-mono text-[11.5px] text-gild-deep">{t.token}</dt>
            <dd className="text-[12px] text-ink-soft">{t.describes}</dd>
          </div>
        ))}
      </dl>
    </details>
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

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save wording'}
    </PortalButton>
  )
}
