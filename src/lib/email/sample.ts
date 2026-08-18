import type { OrderEmailData } from '@/lib/email/templates'

/**
 * A believable order, for previewing and test sends.
 *
 * Deliberately not a minimal one: two lines, a discount-free but taxed total,
 * a real-looking address and a tracking number. A preview built from an empty
 * order hides exactly the layout problems a preview exists to catch.
 */
export function sampleOrder(): OrderEmailData {
  return {
    orderNumber: 'HM-1042',
    customerName: 'Marisol Vega',
    email: 'marisol@example.com',
    items: [
      { name: 'Black Sea Mist', quantity: 2, unitPriceCents: 2400, lineTotalCents: 4800 },
      { name: 'Moonlit Snow', quantity: 1, unitPriceCents: 3200, lineTotalCents: 3200 },
    ],
    subtotalCents: 8000,
    shippingCents: 0,
    taxCents: 400,
    totalCents: 8400,
    currency: 'usd',
    shippingAddress: JSON.stringify({
      firstName: 'Marisol',
      lastName: 'Vega',
      addressLine1: '12 Moonlight Lane',
      addressLine2: 'Apt 4',
      locality: 'Portland',
      administrativeDistrictLevel1: 'OR',
      postalCode: '97201',
      country: 'US',
    }),
    trackingNumber: '9400 1000 0000 0000 0000 00',
    carrier: 'USPS',
  }
}
