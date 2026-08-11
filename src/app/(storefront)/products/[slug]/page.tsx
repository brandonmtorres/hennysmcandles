import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getProductBySlug, getRelatedProducts, toCard } from '@/lib/products'
import { Gallery } from '@/components/product/Gallery'
import { PurchasePanel } from '@/components/product/PurchasePanel'
import { ProductTile } from '@/components/product/ProductCard'
import { LitSection } from '@/components/visual/LitSection'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Candle not found' }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} · Hennys M. Homemade Candles`,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [related, reviews] = await Promise.all([
    getRelatedProducts(slug, 3),
    db.review.findMany({
      where: { published: true, productId: product.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  const card = toCard(product)

  const notes = [
    { label: 'Top', value: product.scentTop },
    { label: 'Heart', value: product.scentHeart },
    { label: 'Base', value: product.scentBase },
  ].filter((n) => n.value)

  const specs = [
    { label: 'Size', value: `${product.sizeOz} oz` },
    { label: 'Burn time', value: `About ${product.burnTimeHours} hours` },
    { label: 'Wax', value: product.wax },
    { label: 'Wick', value: product.wick },
  ]

  // Structured data helps the product surface correctly in search results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Hennys M. Homemade Candles' },
    offers: {
      '@type': 'Offer',
      price: (card.effectivePriceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: card.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      {/*
        `<` is escaped to its unicode form. JSON.stringify leaves it intact,
        so a product name containing "</script>" would otherwise close this
        block and execute whatever followed. Product text is owner-editable
        rather than public, but this is one character's worth of insurance.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="border-b border-wax/8 bg-obsidian px-5 pb-14 pt-10 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="label-sm mb-10 flex gap-2 text-smoke">
            <Link href="/" className="transition-colors hover:text-wax">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/products" className="transition-colors hover:text-wax">
              Candles
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-wax/70">{product.name}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <Gallery images={card.images} name={product.name} />

            <div className="lg:sticky lg:top-28 lg:self-start">
              {product.crystal ? (
                <p className="label text-gild/90">Set with {product.crystal}</p>
              ) : null}

              <h1 className="display-lg mt-4 text-wax">{product.name}</h1>
              <p className="label-sm mt-4 text-smoke">{product.scent}</p>
              <p className="lede mt-6 max-w-[46ch]">{product.tagline}</p>

              <div className="mt-10 border-t border-wax/12 pt-10">
                <PurchasePanel product={card} />
              </div>

              {notes.length > 0 ? (
                <section className="mt-12 border-t border-wax/12 pt-10">
                  <h2 className="label mb-6 text-wax">The scent</h2>
                  <dl className="flex flex-col gap-4">
                    {notes.map((note) => (
                      <div key={note.label} className="flex gap-6">
                        <dt className="label-sm w-14 shrink-0 pt-1 text-gild/80">
                          {note.label}
                        </dt>
                        <dd className="text-[14.5px] leading-relaxed text-wax/85">
                          {note.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {product.crystal ? (
                <section className="mt-12 border-t border-wax/12 pt-10">
                  <h2 className="label mb-5 text-wax">The stone</h2>
                  <p className="display-sm text-gild">{product.crystal}</p>
                  {product.crystalMeaning ? (
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-smoke">
                      {product.crystalMeaning}. Set into the wax by hand — lift it out
                      and keep it when the candle is finished.
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section className="mt-12 border-t border-wax/12 pt-10">
                <h2 className="label mb-6 text-wax">Details</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {specs.map((spec) => (
                    <div key={spec.label}>
                      <dt className="label-sm text-smoke">{spec.label}</dt>
                      <dd className="mt-1.5 text-[14px] text-wax/85">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-7 text-[13px] leading-relaxed text-smoke">
                  {product.ingredients}
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* The story */}
      {product.story ? (
        <LitSection glow className="bg-obsidian px-5 py-24 sm:px-8">
          <div className="relative mx-auto max-w-3xl">
            <p className="label reveal text-gild/90">Why this one exists</p>
            <div
              className="prose-hm reveal mt-8 text-[17px] leading-[1.82] text-wax/80"
              style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
            >
              {product.story.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </LitSection>
      ) : null}

      {/* Reviews for this candle */}
      {reviews.length > 0 ? (
        <section className="border-t border-wax/8 bg-pitch px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="display-md reveal text-wax">What people say about it</h2>
            <ul className="mt-10 flex flex-col gap-10">
              {reviews.map((review) => (
                <li key={review.id} className="reveal border-t border-wax/12 pt-7">
                  <span className="flex gap-1" aria-label={`${review.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg
                        key={i}
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className={i < review.rating ? 'fill-gild' : 'fill-wax/18'}
                      >
                        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z" />
                      </svg>
                    ))}
                  </span>
                  {review.title ? (
                    <p className="display-sm mt-4 text-wax">&ldquo;{review.title}&rdquo;</p>
                  ) : null}
                  <p className="mt-3 text-[14.5px] leading-relaxed text-smoke">
                    {review.body}
                  </p>
                  <p className="label-sm mt-5 text-gild/80">{review.author}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Related */}
      {related.length > 0 ? (
        <section className="border-t border-wax/8 bg-obsidian px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="display-md reveal text-wax">You might also like</h2>
            <div className="mt-14 grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <ProductTile key={item.id} product={item} index={index} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
