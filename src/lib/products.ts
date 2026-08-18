import { db } from '@/lib/db'
import { effectivePriceCents, isDiscounted, resolveDiscountPercent } from '@/lib/money'
import type { Prisma } from '@prisma/client'

export type Visibility = 'VISIBLE' | 'HIDDEN' | 'AUTO'

/**
 * What the storefront lists.
 *
 *  VISIBLE — listed. At zero stock it shows as sold out rather than vanishing.
 *  HIDDEN  — never listed.
 *  AUTO    — legacy. Behaves as VISIBLE.
 *
 * Selling out used to remove a candle from the shop entirely, which threw away
 * the most useful thing an empty shelf can do: tell someone the scent exists,
 * that other people wanted it, and that it is worth coming back for. A sold-out
 * card also keeps its link alive — anything already shared or indexed still
 * leads somewhere rather than to a 404.
 *
 * Emptiness is therefore a state a product is *shown in*, not a reason to hide
 * it. Only a deliberate "Hidden" takes a candle off the shop.
 */
export const STOREFRONT_VISIBILITY: Prisma.ProductWhereInput = {
  visibility: { not: 'HIDDEN' },
}

/**
 * A few candles to link from the footer.
 *
 * These used to be three slugs typed into the footer by hand, which meant a
 * hidden candle stayed linked from every page on the site, and a renamed one
 * would have sent every visitor to a 404. Reading them from the catalogue
 * costs one small query on a page that is already dynamic.
 */
export async function getFooterCandles(limit = 3) {
  return db.product.findMany({
    where: STOREFRONT_VISIBILITY,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    take: limit,
    select: { slug: true, name: true },
  })
}

/**
 * Collections come along with every storefront product query so a promotion
 * is priced in wherever a candle is shown. Loading them separately would
 * eventually leave one surface quoting a price another does not honour.
 */
const withImages = {
  images: { orderBy: { sortOrder: 'asc' } },
  collections: { include: { collection: true } },
} satisfies Prisma.ProductInclude

export type ProductWithImages = Prisma.ProductGetPayload<{ include: typeof withImages }>

/** Plain, serialisable shape handed to client components. */
export type ProductCard = {
  id: string
  slug: string
  name: string
  tagline: string
  scent: string
  description: string
  priceCents: number
  effectivePriceCents: number
  discounted: boolean
  salePercent: number
  stock: number
  inStock: boolean
  crystal: string | null
  crystalMeaning: string | null
  sizeOz: number
  images: { url: string; alt: string }[]
}

export function toCard(p: ProductWithImages, now = new Date()): ProductCard {
  const promos = p.collections.map((link) => link.collection)
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    scent: p.scent,
    description: p.description,
    priceCents: p.priceCents,
    effectivePriceCents: effectivePriceCents(p, promos, now),
    discounted: isDiscounted(p, promos, now),
    salePercent: resolveDiscountPercent(p, promos, now),
    stock: p.stock,
    inStock: p.stock > 0,
    crystal: p.crystal,
    crystalMeaning: p.crystalMeaning,
    sizeOz: p.sizeOz,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
  }
}

export async function getStorefrontProducts(): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: STOREFRONT_VISIBILITY,
    include: withImages,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map((row) => toCard(row))
}

export async function getFeaturedProducts(limit = 4): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: { ...STOREFRONT_VISIBILITY, featured: true },
    include: withImages,
    orderBy: [{ sortOrder: 'asc' }],
    take: limit,
  })
  return rows.map((row) => toCard(row))
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findFirst({
    where: { slug, ...STOREFRONT_VISIBILITY },
    include: withImages,
  })
  return product
}

export async function getRelatedProducts(slug: string, limit = 3): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: { ...STOREFRONT_VISIBILITY, NOT: { slug } },
    include: withImages,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    take: limit,
  })
  return rows.map((row) => toCard(row))
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db.product.findMany({
    where: STOREFRONT_VISIBILITY,
    select: { slug: true },
  })
  return rows.map((r) => r.slug)
}
