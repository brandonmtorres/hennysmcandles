import 'server-only'
import type { Square } from 'square'
import { getSquare, money, squareLocationId } from './client'

/**
 * Builds a Square order from a priced cart and creates a hosted payment link.
 *
 * Every amount handed to Square is computed by the caller from the database.
 * Nothing here reads a price, a discount or a quantity from a request body —
 * this module's only job is translating amounts this codebase already trusts
 * into the shape Square wants.
 */

export type CheckoutLine = {
  productId: string
  name: string
  slug: string
  unitPriceCents: number
  quantity: number
}

export type PaymentLinkInput = {
  /** Our CheckoutSession id. Travels as the order's reference so the webhook
   *  can find the quote again without stuffing the cart into metadata. */
  reference: string
  lines: CheckoutLine[]
  currency: string
  shippingCents: number
  discountCents: number
  discountLabel: string | null
  /** Percentage as a number, e.g. 7.25. Zero when the destination is untaxed. */
  taxPercent: number
  /**
   * Two-letter state, prefilled on Square's form to discourage a mismatch.
   * Empty when the shop charges no tax and so never asked for it.
   */
  shipToState: string
  redirectUrl: string
  supportEmail: string
}

export type PaymentLinkResult = {
  url: string
  squareOrderId: string
  paymentLinkId: string
}

/** Square wants a tax rate as a decimal string: 7.25 becomes "7.25". */
function percentageString(percent: number): string {
  return (Math.round(percent * 1000) / 1000).toString()
}

export async function createPaymentLink(
  input: PaymentLinkInput,
): Promise<PaymentLinkResult> {
  const currency = input.currency

  const lineItems: Square.OrderLineItem[] = input.lines.map((line, index) => ({
    uid: `item-${index}`,
    name: line.name,
    quantity: String(line.quantity),
    // Square multiplies this by the quantity itself; sending a line total here
    // would charge the square of the quantity.
    basePriceMoney: money(line.unitPriceCents, currency),
  }))

  // Order-scoped, so Square spreads it across the line items rather than us
  // deciding which candle bears the discount. Square applies discounts before
  // tax, which is the same order our own totals use.
  const discounts: Square.OrderLineItemDiscount[] | undefined =
    input.discountCents > 0
      ? [
          {
            uid: 'promo',
            name: input.discountLabel ?? 'Discount',
            type: 'FIXED_AMOUNT',
            amountMoney: money(input.discountCents, currency),
            scope: 'ORDER',
          },
        ]
      : undefined

  // ADDITIVE: added on top of the price rather than assumed to be inside it.
  const taxes: Square.OrderLineItemTax[] | undefined =
    input.taxPercent > 0
      ? [
          {
            uid: 'tax',
            name: 'Sales tax',
            type: 'ADDITIVE',
            percentage: percentageString(input.taxPercent),
            scope: 'ORDER',
          },
        ]
      : undefined

  const order: Square.Order = {
    locationId: squareLocationId(),
    referenceId: input.reference,
    lineItems,
    ...(discounts ? { discounts } : {}),
    ...(taxes ? { taxes } : {}),
    metadata: { checkoutSessionId: input.reference },
  }

  const response = await getSquare().checkout.paymentLinks.create({
    // Our own session id: a retried request reuses the existing link rather
    // than creating a second one for the same cart.
    idempotencyKey: input.reference,
    order,
    checkoutOptions: {
      redirectUrl: input.redirectUrl,
      askForShippingAddress: true,
      merchantSupportEmail: input.supportEmail,
      allowTipping: false,
      // Our promo codes are validated against our own rules before we ever get
      // here. Square's coupon field would be a second, unrelated discount
      // system on the same page.
      enableCoupon: false,
      enableLoyalty: false,
      // Shipping rides as a service charge. It is deliberately outside the tax
      // above, which applies to goods only.
      ...(input.shippingCents > 0
        ? {
            shippingFee: {
              name: 'Standard shipping (2–5 days)',
              charge: money(input.shippingCents, currency),
            },
          }
        : {}),
    },
    prePopulatedData: {
      // Prefilling the state the customer already told us makes the common
      // case agree with what tax was charged on. With no tax there is nothing
      // to agree with, so only the country is set.
      buyerAddress: {
        ...(input.shipToState ? { administrativeDistrictLevel1: input.shipToState } : {}),
        country: 'US',
      },
    },
  })

  const link = response.paymentLink
  if (!link?.url || !link.orderId || !link.id) {
    throw new Error('Square did not return a usable payment link.')
  }

  return { url: link.url, squareOrderId: link.orderId, paymentLinkId: link.id }
}
