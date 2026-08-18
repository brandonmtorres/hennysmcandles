import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { effectivePriceCents } from '@/lib/money'
import { checkPromoCode } from '@/lib/promo'
import { checkoutItemSchema } from '@/lib/validation'
import { clientIpFrom, createThrottle } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  items: z.array(checkoutItemSchema).min(1).max(30),
})

// Codes are guessable by design, so previewing one is throttled per address.
const throttled = createThrottle({
  windowMs: 60_000,
  perVisitor: 12,
  shared: 120,
})

/**
 * Previews a promo code against the current cart.
 *
 * The subtotal is recomputed here from the database rather than taken from the
 * request, for the same reason checkout does: a client-supplied total could
 * otherwise unlock a minimum-spend code that has not been met.
 */
export async function POST(request: Request) {
  if (throttled(clientIpFrom(request.headers))) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a code.' }, { status: 400 })
  }

  const quantities = new Map<string, number>()
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }

  const products = await db.product.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: { collections: { include: { collection: true } } },
  })

  const subtotalCents = products.reduce((sum, product) => {
    const quantity = quantities.get(product.id) ?? 0
    const unit = effectivePriceCents(
      product,
      product.collections.map((link) => link.collection),
    )
    return sum + unit * quantity
  }, 0)

  const result = await checkPromoCode(parsed.data.code, subtotalCents)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  return NextResponse.json({
    code: result.code,
    discountCents: result.discountCents,
    describe: result.describe,
    subtotalCents,
  })
}
