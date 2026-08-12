import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getStorefrontCollections } from '@/lib/collections'
import { LitSection } from '@/components/visual/LitSection'
import { pluralise } from '@/lib/words'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'Seasonal edits and gift sets from Hennys M. Homemade Candles — hand-poured soy candles set with raw crystals.',
}

export default async function CollectionsIndexPage() {
  const collections = await getStorefrontCollections()

  return (
    <>
      <header className="veil border-b border-wax/8 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="label text-gild/90">Collections</p>
          <h1 className="display-lg mt-5 max-w-[16ch] text-wax">
            Gathered <span className="script text-gild">by season</span>
          </h1>
          <p className="lede mt-6 max-w-[52ch]">
            Small groups of candles that belong together — a midwinter edit, a set for
            gifting, whatever Hennys is pouring at the time.
          </p>
        </div>
      </header>

      <LitSection glow className="veil px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative mx-auto max-w-7xl">
          {collections.length === 0 ? (
            <div className="py-24 text-center">
              <p className="display-sm text-wax">No collections just now</p>
              <p className="mt-3 text-[14.5px] text-smoke">
                Every candle is still on the shelf.
              </p>
              <Link
                href="/products"
                className="label-sm mt-8 inline-block text-wax underline decoration-gild/50 underline-offset-[6px] transition-colors hover:text-gild"
              >
                See the collection
              </Link>
            </div>
          ) : (
            <ul className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection, index) => (
                <li
                  key={collection.id}
                  className="reveal group"
                  style={
                    { '--reveal-delay': `${index * 80}ms` } as React.CSSProperties
                  }
                >
                  <Link href={`/collections/${collection.slug}`} className="block">
                    <div className="relative aspect-[5/4] overflow-hidden bg-ash">
                      {collection.imageUrl ? (
                        <Image
                          src={collection.imageUrl}
                          alt=""
                          fill
                          sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                          className="cinematic object-cover transition-transform duration-[1400ms] group-hover:scale-[1.045]"
                        />
                      ) : null}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-obsidian/20 to-transparent"
                      />
                      {collection.saleActive && collection.salePercent > 0 ? (
                        <span className="label-sm absolute left-3.5 top-3.5 bg-gild px-2.5 py-1.5 text-pitch">
                          {collection.salePercent}% off
                        </span>
                      ) : null}
                    </div>

                    <h2 className="display-sm mt-5 text-wax transition-colors duration-500 group-hover:text-gild">
                      {collection.name}
                    </h2>
                    {collection.tagline ? (
                      <p className="mt-2.5 max-w-[42ch] text-[14px] leading-relaxed text-smoke">
                        {collection.tagline}
                      </p>
                    ) : null}
                    <p className="label-sm mt-3 text-smoke/75">
                      {collection._count.products}{' '}
                      {pluralise(collection._count.products, 'candle')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </LitSection>
    </>
  )
}
