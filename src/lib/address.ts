/**
 * Formats the shipping address Square collected.
 *
 * One function, used by the portal, the packing slip and the emails alike.
 * There used to be two copies of this — one of them still reading Stripe's
 * field names after the move to Square — and the result was an address block
 * that rendered as the single word "US" in every dispatch email. Anything that
 * displays an address goes through here.
 *
 * Square names fields for the world rather than for the United States:
 * `locality` is the city, `administrativeDistrictLevel1` is the state.
 */
export function addressLines(raw: string | null | undefined): string[] {
  if (!raw) return []

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return []
  }

  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

  return [
    [text(parsed.firstName), text(parsed.lastName)].filter(Boolean).join(' '),
    text(parsed.addressLine1),
    text(parsed.addressLine2),
    text(parsed.addressLine3),
    [
      text(parsed.locality),
      text(parsed.administrativeDistrictLevel1),
      text(parsed.postalCode),
    ]
      .filter(Boolean)
      .join(', '),
    text(parsed.country),
  ].filter((line) => line.length > 0)
}

/** The same address as one block of text, for copying to a label. */
export function addressText(raw: string | null | undefined): string {
  return addressLines(raw).join('\n')
}
