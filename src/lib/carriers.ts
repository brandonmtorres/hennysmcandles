/**
 * Carriers the studio ships with, and where a customer goes to follow a parcel.
 *
 * A tracking number on its own asks the customer to work out whose website to
 * paste it into. A link does not, and it is the single most-clicked thing in a
 * dispatch email.
 */
export const CARRIERS: { name: string; trackingUrl: (n: string) => string }[] = [
  {
    name: 'USPS',
    trackingUrl: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  },
  { name: 'UPS', trackingUrl: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { name: 'FedEx', trackingUrl: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { name: 'DHL', trackingUrl: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}` },
]

export const CARRIER_NAMES = CARRIERS.map((c) => c.name)

/**
 * A tracking link, or null when we cannot build one honestly.
 *
 * "Other" is deliberately not guessable, and a number without a carrier is
 * still worth showing as text — it is just not a link.
 */
export function trackingUrlFor(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!carrier || !trackingNumber) return null
  const match = CARRIERS.find((c) => c.name.toLowerCase() === carrier.trim().toLowerCase())
  if (!match) return null
  return match.trackingUrl(encodeURIComponent(trackingNumber.trim()))
}
