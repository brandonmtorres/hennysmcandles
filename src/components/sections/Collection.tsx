import { ProductTile } from '@/components/product/ProductCard'
import { SectionHeading } from '@/components/sections/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { pluralise, spell } from '@/lib/words'
import type { ProductCard } from '@/lib/products'
import { LitSection } from '@/components/visual/LitSection'

export function Collection({
  products,
  totalCount,
}: {
  products: ProductCard[]
  totalCount: number
}) {
  return (
    <LitSection
      glow
      className="veil border-t border-wax/8 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="collection-heading"
    >
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading
            eyebrow="The collection"
            title={
              <span id="collection-heading">
                {spell(totalCount).replace(/^\w/, (c) => c.toUpperCase())}{' '}
                {pluralise(totalCount, 'scent')},{' '}
                <span className="script text-gild">poured by hand</span>
              </span>
            }
            lede="Each batch is small enough that Hennys sets every crystal herself. When a scent sells out, it stays out until the next pour."
          />
          <ButtonLink
            href="/products"
            variant="outline"
            size="sm"
            className="reveal mb-2 hidden sm:inline-flex"
          >
            All {totalCount} candles
          </ButtonLink>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <ProductTile
              key={product.id}
              product={product}
              index={index}
              priority={index < 2}
            />
          ))}
        </div>

        <div className="mt-14 flex justify-center sm:hidden">
          <ButtonLink href="/products" variant="outline" size="md" className="reveal">
            All {totalCount} candles
          </ButtonLink>
        </div>
      </div>
    </LitSection>
  )
}
