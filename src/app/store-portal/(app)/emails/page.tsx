import { getEmailCopy } from '@/lib/email/copy'
import { EmailTemplateForm } from '@/components/portal/EmailTemplateForm'
import { isEmailSending } from '@/lib/email/send'
import { Banner } from '@/components/portal/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Emails' }

export default async function EmailsPage() {
  const [confirmation, shipping] = await Promise.all([
    getEmailCopy('order_confirmation'),
    getEmailCopy('shipping_notice'),
  ])

  return (
    <>
      <div className="mb-7">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Emails
        </h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-ink-soft">
          The two emails that go out on their own. Change the words to suit you — the
          order details, prices and address fill themselves in.
        </p>
      </div>

      {!isEmailSending() ? (
        <div className="mb-7">
          <Banner tone="warn">
            No email provider is configured, so nothing is actually being delivered —
            every message is written to <code className="font-mono">.mail-preview/</code>{' '}
            instead. Set <code className="font-mono">RESEND_API_KEY</code> and verify your
            sending domain to switch this on.
          </Banner>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        <EmailTemplateForm
          title="Order confirmation"
          description="The receipt, sent the moment a payment clears."
          sentWhen="Sent automatically when Square confirms payment — before you have done anything. It carries the order number, everything they bought, the totals and where it is going."
          values={{ key: 'order_confirmation', ...confirmation }}
        />

        <EmailTemplateForm
          title="On its way"
          description="The dispatch note, sent when you mark an order shipped."
          sentWhen="Sent when you press “Mark as shipped” on an order. If you entered a tracking number it is included, with a link straight to the carrier."
          values={{ key: 'shipping_notice', ...shipping }}
        />
      </div>
    </>
  )
}
