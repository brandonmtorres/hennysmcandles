import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { effectivePriceCents } from '@/lib/money'
import { getSettings, shippingCentsFor } from '@/lib/settings'
import { checkoutRequestSchema } from '@/lib/validation'
import { checkPromoCode } from '@/lib/promo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Creates a Stripe Checkout session.
 *
 * Security model
 * --------------
 *  · The request carries product IDs and quantities only. Prices, names and
 *    discounts are read from the database here, so a tampered cart in
 *    localStorage cannot change what a customer is charged.
 *  · Stock is verified before the session is created, but is NOT decremented
 *    here. Decrementing happens only in the Stripe webhook once payment has
 *    actually succeeded — otherwise abandoned checkouts would drain inventory.
 *  · Card details never touch this server. Stripe's hosted Checkout page
 *    handles them, which also brings Apple Pay and Google Pay along for free.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          'Payments are not configured yet. Add STRIPE_SECRET_KEY to .env to enable checkout.',
      },
      { status: 503 },
    )
  }

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

  const settings = await getSettings()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const lineItems = []
  let subtotalCents = 0

  for (const product of products) {
    const quantity = quantities.get(product.id) ?? 0
    if (quantity <= 0) continue

    // A hidden product must not be purchasable even via a stale cart.
    const purchasable =
      product.visibility === 'VISIBLE' ||
      (product.visibility === 'AUTO' && product.stock > 0)
    if (!purchasable) {
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

    const unitAmount = effectivePriceCents(
      product,
      product.collections.map((link) => link.collection),
    )
    subtotalCents += unitAmount * quantity

    lineItems.push({
      quantity,
      price_data: {
        currency: settings.currency,
        unit_amount: unitAmount,
        product_data: {
          name: product.name,
          description: product.tagline.slice(0, 300),
          images: product.images[0] ? [`${siteUrl}${product.images[0].url}`] : undefined,
          metadata: { productId: product.id, slug: product.slug },
        },
      },
    })
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
  }

  const shippingCents = shippingCentsFor(subtotalCents, settings)

  // The promo code is re-validated here against a subtotal computed from the
  // database. Whatever the cart previewed is irrelevant — this is the number
  // Stripe is told to charge.
  let promo: { id: string; code: string; discountCents: number } | null = null
  if (parsed.data.code) {
    const result = await checkPromoCode(parsed.data.code, subtotalCents)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 422 })
    }
    promo = { id: result.id, code: result.code, discountCents: result.discountCents }
  }

  try {
    const stripe = getStripe()

    // Stripe applies discounts through a coupon, so one is created per order
    // for the exact amount. Creating it fresh keeps our rules — minimum spend,
    // redemption limits, dates — the single source of truth rather than
    // duplicating them into Stripe's own promotion objects.
    const discounts = promo
      ? [
          {
            coupon: (
              await stripe.coupons.create({
                amount_off: promo.discountCents,
                currency: settings.currency,
                duration: 'once',
                name: `${promo.code}`,
                metadata: { promoCodeId: promo.id, code: promo.code },
              })
            ).id,
          },
        ]
      : undefined
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      // Omitting payment_method_types lets Stripe present every method enabled
      // on the account — cards, Apple Pay, Google Pay, Link — chosen per device.
      automatic_tax: { enabled: false },
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingCents, currency: settings.currency },
            display_name:
              shippingCents === 0 ? 'Free shipping' : 'Standard shipping (2–5 days)',
          },
        },
      ],
      discounts,
      phone_number_collection: { enabled: false },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/products`,
      // Read back by the webhook to rebuild the order.
      metadata: {
        cart: JSON.stringify(
          lineItems.map((item) => ({
            id: item.price_data.product_data.metadata.productId,
            q: item.quantity,
          })),
        ),
        ...(promo ? { promoCodeId: promo.id, promoCode: promo.code } : {}),
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout link. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // The raw Stripe error may contain account details — log it, don't ship it.
    console.error('[checkout] Stripe session creation failed:', error)
    return NextResponse.json(
      { error: 'We could not start the checkout. Please try again in a moment.' },
      { status: 502 },
    )
  }
}
