import type { Metadata } from 'next'
import { getStorefrontProducts } from '@/lib/products'
import { ProductTile } from '@/components/product/ProductCard'
import { LitSection } from '@/components/visual/LitSection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Collection',
  description:
    'Every Hennys M. candle: hand-poured soy wax set with raw crystals and dried botanicals, in small batches.',
}

export default async function ProductsPage() {
  const products = await getStorefrontProducts()

  return (
    <>
      <header className="border-b border-wax/8 bg-obsidian px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="label text-gild/90">The collection</p>
          <h1 className="display-lg mt-5 max-w-[18ch] text-wax">
            Every candle, <span className="italic text-gild">poured by hand</span>
          </h1>
          <p className="lede mt-6 max-w-[52ch]">
            Small batches, natural soy wax, and a raw crystal set into every surface.
            When a scent runs out it stays out until the next pour.
          </p>
        </div>
      </header>

      <LitSection glow className="bg-obsidian px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative mx-auto max-w-7xl">
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="display-sm text-wax">The shelves are empty right now</p>
              <p className="mt-3 text-[14.5px] text-smoke">
                A new batch is being poured. Check back in a few days.
              </p>
            </div>
          ) : (
            <>
              <p className="label-sm mb-10 text-smoke">
                {products.length} candle{products.length === 1 ? '' : 's'}
              </p>
              <div className="grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
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
