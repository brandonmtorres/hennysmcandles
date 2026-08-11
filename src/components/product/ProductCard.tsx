import Image from 'next/image'
import Link from 'next/link'
import { formatMoney } from '@/lib/money'
import type { ProductCard as Product } from '@/lib/products'

/**
 * An editorial product tile: a tall image, the scent name set in the display
 * face, and the notes beneath in the same wide caps used on the label.
 */
export function ProductTile({
  product,
  priority = false,
  index = 0,
}: {
  product: Product
  priority?: boolean
  index?: number
}) {
  const image = product.images[0]
  const soldOut = !product.inStock
  const low = product.inStock && product.stock <= 3

  return (
    <article
      className="reveal group"
      style={{ '--reveal-delay': `${Math.min(index, 5) * 90}ms` } as React.CSSProperties}
    >
      <Link href={`/products/${product.slug}`} className="block focus-visible:outline-offset-8">
        <div className="relative aspect-[4/5] overflow-hidden bg-ash">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              priority={priority}
              quality={82}
              sizes="(max-width: 639px) 88vw, (max-width: 1023px) 45vw, 30vw"
              className={[
                'cinematic object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                'group-hover:scale-[1.045]',
                soldOut ? 'opacity-45 saturate-50' : '',
              ].join(' ')}
            />
          ) : null}

          {/* A wash of candlelight that warms on hover. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/75 via-transparent to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[1200ms] group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(72% 52% at 50% 78%, rgba(255,144,54,0.14), transparent 70%)',
            }}
          />

          <div className="absolute left-0 top-0 flex flex-col items-start gap-1.5 p-3.5">
            {product.discounted ? (
              <span className="label-sm bg-gild px-2.5 py-1.5 text-pitch">
                {product.salePercent}% off
              </span>
            ) : null}
            {soldOut ? (
              <span className="label-sm border border-wax/35 bg-obsidian/85 px-2.5 py-1.5 text-wax backdrop-blur-sm">
                Sold out
              </span>
            ) : low ? (
              <span className="label-sm border border-gild/45 bg-obsidian/80 px-2.5 py-1.5 text-gild backdrop-blur-sm">
                {product.stock} left
              </span>
            ) : null}
          </div>

          {product.crystal ? (
            <p className="label-sm absolute bottom-3.5 left-3.5 text-wax/75">
              {product.crystal}
            </p>
          ) : null}
        </div>

        <div className="pt-5">
          <h3 className="display-sm text-wax transition-colors duration-500 group-hover:text-gild">
            {product.name}
          </h3>
          <p className="label-sm mt-2.5 text-smoke">{product.scent}</p>
          <p className="mt-3.5 flex items-baseline gap-2.5 text-[14px] tabular-nums text-wax">
            {formatMoney(product.effectivePriceCents)}
            {product.discounted ? (
              <span className="text-[12.5px] text-smoke line-through">
                {formatMoney(product.priceCents)}
              </span>
            ) : null}
            <span className="text-[12px] text-smoke">· {product.sizeOz} oz</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
