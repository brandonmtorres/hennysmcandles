import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { STOREFRONT_VISIBILITY, toCard } from '@/lib/products'
import { storefrontCollectionWhere } from '@/lib/collections'
import { ProductTile } from '@/components/product/ProductCard'
import {
  ProductFilters,
  SORTS,
  type FilterState,
} from '@/components/product/ProductFilters'
import { LitSection } from '@/components/visual/LitSection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Collection',
  description:
    'Every Hennys M. candle: hand-poured soy wax set with raw crystals and dried botanicals, in small batches.',
}

/**
 * A rough scent family, taken from the last word of the first note. It is
 * derived rather than stored so the owner never has to categorise anything by
 * hand — the notes they already write are enough to group by.
 */
function scentFamily(scent: string): string {
  const first = scent.split('·')[0]?.trim() ?? ''
  return first.split(/\s+/).slice(-1)[0] ?? first
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const read = (key: string) => {
    const value = params[key]
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
  }

  const state: FilterState = {
    collection: read('collection'),
    crystal: read('crystal'),
    scent: read('scent'),
    availability: read('availability') || 'all',
    maxPrice: read('maxPrice'),
    sort: SORTS.some((s) => s.value === read('sort')) ? read('sort') : 'featured',
  }

  const [rows, collectionRows] = await Promise.all([
    db.product.findMany({
      where: STOREFRONT_VISIBILITY,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        collections: { include: { collection: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    db.collection.findMany({
      where: storefrontCollectionWhere(),
      orderBy: [{ sortOrder: 'asc' }],
      include: { _count: { select: { products: true } } },
    }),
  ])

  const all = rows.map((row) => toCard(row))

  // Facet options come from the whole catalogue, so the counts describe what
  // exists rather than what the current filter happens to leave behind.
  const countBy = (pick: (index: number) => string | null) => {
    const tally = new Map<string, number>()
    all.forEach((_, i) => {
      const key = pick(i)
      if (!key) return
      tally.set(key, (tally.get(key) ?? 0) + 1)
    })
    return [...tally.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const crystals = countBy((i) => all[i]?.crystal ?? null)
  const scents = countBy((i) => scentFamily(all[i]?.scent ?? '') || null)

  const collections = collectionRows
    .filter((c) => c._count.products > 0)
    .map((c) => ({ value: c.slug, label: c.name, count: c._count.products }))

  // --- Apply the filters ----------------------------------------------------
  const idsInCollection = new Set(
    state.collection
      ? rows
          .filter((r) => r.collections.some((l) => l.collection.slug === state.collection))
          .map((r) => r.id)
      : [],
  )

  const visible = all
    .filter((product) => {
      if (state.collection && !idsInCollection.has(product.id)) return false
      if (state.crystal && product.crystal !== state.crystal) return false
      if (state.scent && scentFamily(product.scent) !== state.scent) return false
      if (state.availability === 'in-stock' && !product.inStock) return false
      if (state.availability === 'on-sale' && !product.discounted) return false
      if (state.maxPrice) {
        const cap = Number.parseInt(state.maxPrice, 10)
        if (Number.isFinite(cap) && product.effectivePriceCents > cap) return false
      }
      return true
    })
    .sort((a, b) => {
      const order = (id: string) => all.findIndex((p) => p.id === id)
      switch (state.sort) {
        case 'price-asc':
          return a.effectivePriceCents - b.effectivePriceCents
        case 'price-desc':
          return b.effectivePriceCents - a.effectivePriceCents
        case 'name':
          return a.name.localeCompare(b.name)
        case 'newest':
          return order(b.id) - order(a.id)
        default:
          return order(a.id) - order(b.id)
      }
    })

  return (
    <>
      <header className="veil border-b border-wax/8 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="label text-gild/90">The collection</p>
          <h1 className="display-lg mt-5 max-w-[18ch] text-wax">
            Every candle, <span className="script text-gild">poured by hand</span>
          </h1>
          <p className="lede mt-6 max-w-[52ch]">
            Small batches, natural soy wax, and a raw crystal set into every surface.
            When a scent runs out it stays out until the next pour.
          </p>
        </div>
      </header>

      <LitSection glow className="veil px-5 py-12 sm:px-8 sm:py-16">
        <div className="relative mx-auto max-w-7xl">
          <ProductFilters
            state={state}
            collections={collections}
            crystals={crystals}
            scents={scents}
            resultCount={visible.length}
            totalCount={all.length}
          />

          {visible.length === 0 ? (
            <div className="py-24 text-center">
              <p className="display-sm text-wax">Nothing matches that</p>
              <p className="mt-3 text-[14.5px] text-smoke">
                Try loosening a filter — or see the whole shelf.
              </p>
              <Link
                href="/products"
                className="label-sm mt-8 inline-block text-wax underline decoration-gild/50 underline-offset-[6px] transition-colors hover:text-gild"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product, index) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  index={index}
                  priority={index < 3}
                />
              ))}
            </div>
          )}
        </div>
      </LitSection>
    </>
  )
}
