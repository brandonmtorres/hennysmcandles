import { CartProvider } from '@/components/cart/CartProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ScrollChoreography } from '@/components/visual/ScrollChoreography'
import { getSettings } from '@/lib/settings'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettings()

  return (
    <CartProvider>
      <ScrollChoreography />
      <Header announcement={settings.announcement} />
      <main id="main">{children}</main>
      <Footer discountPercent={settings.newsletterDiscountPercent} />
      <CartDrawer freeShippingThresholdCents={settings.freeShippingThresholdCents} />
    </CartProvider>
  )
}
