import { ProductTile } from '@/components/product/ProductCard'
import { SectionHeading } from '@/components/sections/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { pluralise, spell } from '@/lib/words'
import type { ProductCard } from '@/lib/products'
import { LitSection } from '@/components/visual/LitSection'
import { ScriptText } from '@/components/brand/ScriptText'

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
      {/* Wider than the rest of the page so six tiles have room to breathe
          across a single row. */}
      <div className="relative mx-auto max-w-[92rem]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading
            eyebrow="The collection"
            title={
              <span id="collection-heading">
                {spell(totalCount).replace(/^\w/, (c) => c.toUpperCase())}{' '}
                {pluralise(totalCount, 'scent')},{' '}
                <ScriptText className="text-gild">poured by hand</ScriptText>
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

        {/* The whole showcase on one row from lg up; two and three columns
            below that, where a six-across strip would be unreadable.

            Narrower than the heading above it on purpose. Stretched the full
            width of the section the tiles grew large enough to compete with the
            hero, and a row of shop-window samples should invite a closer look
            rather than shout. */}
        <div className="mx-auto mt-16 grid max-w-[68rem] grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6 lg:gap-x-5">
          {products.map((product, index) => (
            <ProductTile
              key={product.id}
              product={product}
              index={index}
              priority={index < 3}
              compact
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
