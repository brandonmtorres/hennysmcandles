import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSquareConfigured } from '@/lib/square/client'
import { createPaymentLink, type CheckoutLine } from '@/lib/square/checkout'
import { effectivePriceCents } from '@/lib/money'
import { chargesTax, getSettings, shippingCentsFor, taxCentsFor } from '@/lib/settings'
import { checkoutRequestSchema } from '@/lib/validation'
import { isUsState } from '@/lib/us-states'
import { checkPromoCode } from '@/lib/promo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** How long a quoted cart stays payable. */
const SESSION_MINUTES = 120

/**
 * Creates a Square hosted checkout link.
 *
 * Security model
 * --------------
 *  · The request carries product IDs, quantities and a destination state only.
 *    Prices, discounts, shipping and tax are computed here from the database,
 *    so a tampered cart in localStorage cannot change what a customer is
 *    charged.
 *  · Stock is verified before the link is created, but is NOT decremented
 *    here. Decrementing happens only in the Square webhook once payment has
 *    actually succeeded — otherwise abandoned checkouts would drain inventory.
 *  · Card details never touch this server. Square's hosted page handles them,
 *    which also brings Apple Pay, Google Pay and Cash App Pay along for free.
 *
 * The quote is written to a CheckoutSession row before the customer leaves.
 * That row — not the payment's metadata — is what the webhook reads back to
 * rebuild the order, so a cart of any size survives the round trip.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = checkoutRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That cart is not valid.' },
      { status: 400 },
    )
  }

  const settings = await getSettings()

  // The destination is only demanded when it changes the amount. With no tax
  // configured it changes nothing, so the cart never asked — and Square's own
  // page collects the shipping address a moment later.
  const shipToState = parsed.data.state ?? ''
  if (chargesTax(settings) && !isUsState(shipToState)) {
    return NextResponse.json(
      { error: 'Choose the state you are shipping to.' },
      { status: 400 },
    )
  }

  // Collapse duplicate lines so a repeated id cannot be used to bypass the
  // per-line quantity cap.
  const quantities = new Map<string, number>()
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }

  // Collections are loaded with the products so a live promotion is priced in
  // here exactly as it was shown on the product page. Pricing the cart from a
  // different query than the storefront is how a shop ends up charging more
  // than it advertised.
  const products = await db.product.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      collections: { include: { collection: true } },
    },
  })

  if (products.length === 0) {
    return NextResponse.json(
      { error: 'Those candles are no longer available.' },
      { status: 400 },
    )
  }

  // Checked after the request has been judged on its own merits, so that a
  // malformed cart is answered the same way whether or not payments happen to
  // be switched on.
  if (!isSquareConfigured()) {
    return NextResponse.json(
      {
        error:
          'Payments are not configured yet. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to .env to enable checkout.',
      },
      { status: 503 },
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const lines: CheckoutLine[] = []
  let subtotalCents = 0

  for (const product of products) {
    const quantity = quantities.get(product.id) ?? 0
    if (quantity <= 0) continue

    // A hidden product must not be purchasable even via a stale cart. Being
    // sold out is handled separately, just below — that is a stock problem
    // with its own, more useful message.
    if (product.visibility === 'HIDDEN') {
      return NextResponse.json(
        { error: `${product.name} is no longer available.` },
        { status: 409 },
      )
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        {
          error:
            product.stock === 0
              ? `${product.name} has just sold out.`
              : `Only ${product.stock} of ${product.name} left. Please lower the quantity.`,
        },
        { status: 409 },
      )
    }

    const unitPriceCents = effectivePriceCents(
      product,
      product.collections.map((link) => link.collection),
    )
    subtotalCents += unitPriceCents * quantity

    lines.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPriceCents,
      quantity,
    })
  }

  if (lines.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  const shippingCents = shippingCentsFor(subtotalCents, settings)

  // The promo code is re-validated here against a subtotal computed from the
  // database. Whatever the cart previewed is irrelevant — this is the number
  // Square is told to charge.
  let promo: { id: string; code: string; discountCents: number } | null = null
  if (parsed.data.code) {
    const result = await checkPromoCode(parsed.data.code, subtotalCents)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 422 })
    }
    promo = { id: result.id, code: result.code, discountCents: result.discountCents }
  }

  const discountCents = promo?.discountCents ?? 0
  const taxCents = taxCentsFor(subtotalCents - discountCents, shipToState, settings)
  const totalCents = subtotalCents - discountCents + shippingCents + taxCents

  // The quote is recorded before the customer leaves, and never recomputed.
  // A price edited in the portal while someone is mid-checkout therefore
  // cannot change what they agreed to pay.
  const session = await db.checkoutSession.create({
    data: {
      cart: JSON.stringify(
        lines.map((line) => ({
          id: line.productId,
          q: line.quantity,
          unit: line.unitPriceCents,
          name: line.name,
          slug: line.slug,
        })),
      ),
      promoCodeId: promo?.id ?? null,
      promoCode: promo?.code ?? null,
      subtotalCents,
      shippingCents,
      taxCents,
      discountCents,
      totalCents,
      currency: settings.currency,
      shipToState,
      expiresAt: new Date(Date.now() + SESSION_MINUTES * 60_000),
    },
  })

  try {
    const link = await createPaymentLink({
      reference: session.id,
      lines,
      currency: settings.currency,
      shippingCents,
      discountCents,
      discountLabel: promo?.code ?? null,
      // The rate, not the amount: Square recomputes it against the discounted
      // goods, and the webhook reconciles its figure against ours.
      taxPercent: taxCents > 0 ? settings.taxPercent : 0,
      shipToState,
      // Our own session id, not Square's — the success page then does not
      // depend on how Square happens to name its redirect parameters.
      redirectUrl: `${siteUrl}/checkout/success?cs=${session.id}`,
      supportEmail: settings.storeEmail,
    })

    await db.checkoutSession.update({
      where: { id: session.id },
      data: {
        squareOrderId: link.squareOrderId,
        squarePaymentLinkId: link.paymentLinkId,
        paymentLinkUrl: link.url,
      },
    })

    return NextResponse.json({ url: link.url })
  } catch (error) {
    // The raw Square error may contain account details — log it, don't ship it.
    console.error('[checkout] Square payment link creation failed:', error)
    await db.checkoutSession
      .update({ where: { id: session.id }, data: { status: 'EXPIRED' } })
      .catch(() => {})
    return NextResponse.json(
      { error: 'We could not start the checkout. Please try again in a moment.' },
      { status: 502 },
    )
  }
}
