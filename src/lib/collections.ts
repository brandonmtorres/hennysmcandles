import { db } from '@/lib/db'
import { effectivePriceCents, isDiscounted, resolveDiscountPercent } from '@/lib/money'
import type { Prisma } from '@prisma/client'
import type { ProductCard } from '@/lib/products'

export type CollectionVisibility = 'VISIBLE' | 'HIDDEN' | 'SCHEDULED'

/**
 * Which collections the storefront will show.
 *
 * SCHEDULED is filtered by date here rather than in application code so a
 * seasonal edit disappears on its own without anyone remembering to hide it.
 */
export function storefrontCollectionWhere(now = new Date()): Prisma.CollectionWhereInput {
  return {
    OR: [
      { visibility: 'VISIBLE' },
      {
        visibility: 'SCHEDULED',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    ],
  }
}

const withProducts = {
  products: {
    orderBy: { sortOrder: 'asc' },
    include: {
      product: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  },
} satisfies Prisma.CollectionInclude

export type CollectionCard = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  imageUrl: string | null
  salePercent: number
  saleActive: boolean
  productCount: number
  products: ProductCard[]
}

type ProductRow = Prisma.ProductGetPayload<{ include: { images: true } }>

/**
 * Builds the card shape for a product, applying whichever discount wins
 * between the product's own sale and any live collection promotion it sits in.
 */
export function toCardWithPromos(
  product: ProductRow,
  promos: Parameters<typeof effectivePriceCents>[1] = [],
  now = new Date(),
): ProductCard {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    scent: product.scent,
    description: product.description,
    priceCents: product.priceCents,
    effectivePriceCents: effectivePriceCents(product, promos, now),
    discounted: isDiscounted(product, promos, now),
    salePercent: resolveDiscountPercent(product, promos, now),
    stock: product.stock,
    inStock: product.stock > 0,
    crystal: product.crystal,
    crystalMeaning: product.crystalMeaning,
    sizeOz: product.sizeOz,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
  }
}

export async function getStorefrontCollections(now = new Date()) {
  return db.collection.findMany({
    where: storefrontCollectionWhere(now),
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { products: true } } },
  })
}

/** The collection currently dressing the home page, if any. */
export async function getActiveBanner(now = new Date()) {
  const collection = await db.collection.findFirst({
    where: {
      ...storefrontCollectionWhere(now),
      bannerActive: true,
      NOT: { theme: 'NONE' },
    },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: withProducts,
  })
  if (!collection) return null

  return {
    slug: collection.slug,
    name: collection.name,
    theme: collection.theme,
    bannerHeading: collection.bannerHeading,
    bannerBody: collection.bannerBody,
    salePercent: collection.salePercent,
    saleActive: collection.saleActive,
    products: collection.products
      .filter(
        (link) =>
          // Sold-out candles stay in the collection, marked as such. See
          // STOREFRONT_VISIBILITY in products.ts.
          link.product.visibility !== 'HIDDEN',
      )
      .map((link) => toCardWithPromos(link.product, [collection], now)),
  }
}

export async function getFeaturedCollections(limit = 2, now = new Date()) {
  const rows = await db.collection.findMany({
    where: { ...storefrontCollectionWhere(now), featured: true },
    orderBy: [{ sortOrder: 'asc' }],
    take: limit,
    include: withProducts,
  })

  return rows.map((collection) => ({
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    tagline: collection.tagline,
    description: collection.description,
    imageUrl: collection.imageUrl,
    salePercent: collection.salePercent,
    saleActive: collection.saleActive,
    productCount: collection.products.length,
    products: collection.products
      // A hidden or sold-through candle should not surface via a collection.
      .filter(
        (link) =>
          // Sold-out candles stay in the collection, marked as such. See
          // STOREFRONT_VISIBILITY in products.ts.
          link.product.visibility !== 'HIDDEN',
      )
      .map((link) => toCardWithPromos(link.product, [collection], now)),
  })) satisfies CollectionCard[]
}

export async function getCollectionBySlug(slug: string, now = new Date()) {
  const collection = await db.collection.findFirst({
    where: { slug, ...storefrontCollectionWhere(now) },
    include: withProducts,
  })
  if (!collection) return null

  return {
    ...collection,
    cards: collection.products
      .filter(
        (link) =>
          // Sold-out candles stay in the collection, marked as such. See
          // STOREFRONT_VISIBILITY in products.ts.
          link.product.visibility !== 'HIDDEN',
      )
      .map((link) => toCardWithPromos(link.product, [collection], now)),
  }
}

/**
 * Every live promotion touching the given products, keyed by product id.
 * Used by the checkout builder and the product page so both price a candle
 * exactly the same way.
 */
export async function promosForProducts(
  productIds: string[],
  now = new Date(),
): Promise<Map<string, Parameters<typeof effectivePriceCents>[1]>> {
  if (productIds.length === 0) return new Map()

  const links = await db.productCollection.findMany({
    where: { productId: { in: productIds } },
    include: { collection: true },
  })

  const map = new Map<string, Parameters<typeof effectivePriceCents>[1]>()
  for (const link of links) {
    const list = map.get(link.productId) ?? []
    list.push(link.collection)
    map.set(link.productId, list)
  }
  return map
}
