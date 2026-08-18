import { getSettings } from '@/lib/settings'
import { SettingsForm } from '@/components/portal/SettingsForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Settings
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Shipping, notifications, and the message across the top of the shop.
        </p>
      </div>

      <SettingsForm
        values={{
          storeName: settings.storeName,
          storeEmail: settings.storeEmail,
          shippingFlat: (settings.shippingFlatCents / 100).toFixed(2),
          freeShippingThreshold: (settings.freeShippingThresholdCents / 100).toFixed(2),
          taxPercent: settings.taxPercent,
          taxHomeState: settings.taxHomeState,
          lowStockThreshold: settings.lowStockThreshold,
          announcement: settings.announcement,
        }}
      />
    </>
  )
}
