import { CartProvider } from '@/components/cart/CartProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { NewsletterPopup } from '@/components/layout/NewsletterPopup'
import { Backdrop } from '@/components/visual/Backdrop'
import { ScrollChoreography } from '@/components/visual/ScrollChoreography'
import { getSettings } from '@/lib/settings'
import { getFooterCandles } from '@/lib/products'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, footerCandles] = await Promise.all([getSettings(), getFooterCandles()])

  return (
    <CartProvider>
      <Backdrop />
      <ScrollChoreography />
      <Header announcement={settings.announcement} />
      <main id="main">{children}</main>
      <Footer
        discountPercent={settings.newsletterDiscountPercent}
        candles={footerCandles}
      />
      <CartDrawer
        freeShippingThresholdCents={settings.freeShippingThresholdCents}
        shippingFlatCents={settings.shippingFlatCents}
        taxPercent={settings.taxPercent}
        taxHomeState={settings.taxHomeState}
      />
      <NewsletterPopup
        copy={{
          enabled: settings.newsletterPopupEnabled,
          discountPercent: settings.newsletterDiscountPercent,
          eyebrow: settings.newsletterPopupEyebrow,
          headingLead: settings.newsletterPopupHeadingLead,
          headingTail: settings.newsletterPopupHeadingTail,
          body: settings.newsletterPopupBody,
          button: settings.newsletterPopupButton,
          delaySeconds: settings.newsletterPopupDelaySeconds,
          scrollPercent: settings.newsletterPopupScrollPercent,
        }}
      />
    </CartProvider>
  )
}
