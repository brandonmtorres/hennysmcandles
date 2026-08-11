import 'server-only'
import Stripe from 'stripe'

/**
 * Stripe client, created lazily.
 *
 * Lazy construction matters: the app must build and the storefront must render
 * even when no Stripe key is configured. Only checkout itself requires one.
 */
let client: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env to enable checkout.',
    )
  }
  if (!client) {
    client = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      appInfo: { name: 'Hennys M. Homemade Candles' },
    })
  }
  return client
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** True when the configured key is a test key, used to show a banner. */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_')
}
