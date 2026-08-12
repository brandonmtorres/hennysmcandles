import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCollectionBySlug } from '@/lib/collections'
import { ProductTile } from '@/components/product/ProductCard'
import { LitSection } from '@/components/visual/LitSection'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) return { title: 'Collection not found' }

  return {
    title: collection.name,
    description: collection.tagline || collection.description || undefined,
  }
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) notFound()

  const promoLive = collection.saleActive && collection.salePercent > 0

  return (
    <>
      <header className="veil border-b border-wax/8 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="label-sm mb-9 flex gap-2 text-smoke">
            <Link href="/" className="transition-colors hover:text-wax">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/products" className="transition-colors hover:text-wax">
              Candles
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-wax/70">{collection.name}</span>
          </nav>

          <p className="label text-gild/90">The collection</p>
          <h1 className="display-lg mt-5 max-w-[18ch] text-wax">{collection.name}</h1>

          {collection.tagline ? (
            <p className="lede mt-6 max-w-[52ch]">{collection.tagline}</p>
          ) : null}

          {promoLive ? (
            <p className="mt-8 inline-flex items-center gap-3 border border-gild/40 bg-gild/10 px-4 py-2.5">
              <span
                aria-hidden="true"
                className="block h-[6px] w-[6px] rotate-45 bg-gild shadow-[0_0_10px_2px_rgba(200,161,90,0.7)]"
              />
              <span className="label-sm text-gild">
                {collection.salePercent}% off everything in this collection
              </span>
            </p>
          ) : null}

          {collection.description ? (
            <div className="prose-hm mt-8 max-w-[62ch] text-[15.5px] leading-[1.78] text-smoke">
              {collection.description.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <LitSection glow className="veil px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative mx-auto max-w-7xl">
          {collection.cards.length === 0 ? (
            <div className="py-24 text-center">
              <p className="display-sm text-wax">Nothing here at the moment</p>
              <p className="mt-3 text-[14.5px] text-smoke">
                These candles are between pours. The rest of the collection is still
                glowing.
              </p>
              <Link
                href="/products"
                className="label-sm mt-8 inline-block text-wax underline decoration-gild/50 underline-offset-[6px] transition-colors hover:text-gild"
              >
                See every candle
              </Link>
            </div>
          ) : (
            <>
              <p className="label-sm mb-10 text-smoke">
                {collection.cards.length} candle
                {collection.cards.length === 1 ? '' : 's'}
              </p>
              <div className="grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {collection.cards.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    index={index}
                    priority={index < 3}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </LitSection>
    </>
  )
}
