import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { PopupForm } from '@/components/portal/PopupForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Signup popup' }

export default async function PopupPage() {
  const settings = await getSettings()

  return (
    <>
      <nav className="mb-5 text-[12.5px] text-ink-soft">
        <Link href="/store-portal/newsletter" className="transition-colors hover:text-ink">
          Newsletter
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-ink">Signup popup</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Signup popup
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[14px] text-ink-soft">
          The invitation that appears on the shop — what it says, what it offers,
          and when it shows up.
        </p>
      </div>

      <PopupForm
        values={{
          enabled: settings.newsletterPopupEnabled,
          discountPercent: settings.newsletterDiscountPercent,
          eyebrow: settings.newsletterPopupEyebrow,
          headingLead: settings.newsletterPopupHeadingLead,
          headingTail: settings.newsletterPopupHeadingTail,
          body: settings.newsletterPopupBody,
          button: settings.newsletterPopupButton,
          welcomeCode: settings.newsletterWelcomeCode,
          delaySeconds: settings.newsletterPopupDelaySeconds,
          scrollPercent: settings.newsletterPopupScrollPercent,
        }}
      />
    </>
  )
}
