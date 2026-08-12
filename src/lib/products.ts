import { db } from '@/lib/db'
import { effectivePriceCents, isDiscounted, resolveDiscountPercent } from '@/lib/money'
import type { Prisma } from '@prisma/client'

export type Visibility = 'VISIBLE' | 'HIDDEN' | 'AUTO'

/**
 * The storefront's definition of "purchasable".
 *
 *  VISIBLE — always listed, even at zero stock (shows as sold out)
 *  HIDDEN  — never listed
 *  AUTO    — listed only while stock remains
 */
export const STOREFRONT_VISIBILITY: Prisma.ProductWhereInput = {
  OR: [{ visibility: 'VISIBLE' }, { visibility: 'AUTO', stock: { gt: 0 } }],
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
