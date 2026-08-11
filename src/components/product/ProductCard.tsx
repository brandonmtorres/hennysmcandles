import Link from 'next/link'
import { Photo } from '@/components/visual/Photo'
import { formatMoney } from '@/lib/money'
import type { ProductCard as Product } from '@/lib/products'

/**
 * An editorial product tile: a tall image, the scent name set in the display
 * face, and the notes beneath in the same wide caps used on the label.
 *
 * The `compact` variant is for the home page, where the whole collection sits
 * in a single row. At roughly 200px wide the scent line wraps to three lines
 * and the crystal badge crowds the frame, so both are dropped — the full card
 * on /products keeps them.
 */
export function ProductTile({
  product,
  priority = false,
  index = 0,
  compact = false,
}: {
  product: Product
  priority?: boolean
  index?: number
  compact?: boolean
}) {
  const image = product.images[0]
  const soldOut = !product.inStock
  const low = product.inStock && product.stock <= 3

  return (
    <article
      className="reveal group"
      style={
        { '--reveal-delay': `${Math.min(index, 5) * 70}ms` } as React.CSSProperties
      }
    >
      <Link href={`/products/${product.slug}`} className="block focus-visible:outline-offset-8">
        <div
          className={[
            'relative overflow-hidden bg-ash',
            compact ? 'aspect-[3/4]' : 'aspect-[4/5]',
          ].join(' ')}
        >
          {image ? (
            <Photo
              src={image.url}
              alt={image.alt}
              fill
              priority={priority}
              quality={82}
              sizes={
                compact
                  ? '(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 16vw'
                  : '(max-width: 639px) 88vw, (max-width: 1023px) 45vw, 30vw'
              }
              className={[
                'cinematic object-cover',
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

          <div
            className={[
              'absolute left-0 top-0 flex flex-col items-start gap-1.5',
              compact ? 'p-2.5' : 'p-3.5',
            ].join(' ')}
          >
            {product.discounted ? (
              <span className="label-sm bg-gild px-2 py-1 text-pitch">
                {product.salePercent}% off
              </span>
            ) : null}
            {soldOut ? (
              <span className="label-sm border border-wax/35 bg-obsidian/85 px-2 py-1 text-wax backdrop-blur-sm">
                Sold out
              </span>
            ) : low ? (
              <span className="label-sm border border-gild/45 bg-obsidian/80 px-2 py-1 text-gild backdrop-blur-sm">
                {product.stock} left
              </span>
            ) : null}
          </div>

          {product.crystal && !compact ? (
            <p className="label-sm absolute bottom-3.5 left-3.5 flex items-center gap-2 text-wax/80">
              <span
                aria-hidden="true"
                className="block h-[5px] w-[5px] rotate-45 bg-amethyst shadow-[0_0_10px_2px_rgba(124,106,156,0.65)]"
              />
              {product.crystal}
            </p>
          ) : null}
        </div>

        <div className={compact ? 'pt-3.5' : 'pt-5'}>
          <h3
            className={[
              'text-wax transition-colors duration-500 group-hover:text-gild',
              compact
                // Two lines are reserved so a name that wraps does not push
                // its crystal and price out of line with the tiles beside it.
                ? 'font-[family-name:var(--font-display)] text-[17px] leading-[1.15] tracking-[-0.01em] min-h-[2.3em]'
                : 'display-sm',
            ].join(' ')}
          >
            {product.name}
          </h3>

          {compact ? (
            product.crystal ? (
              <p className="mt-2 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.2em] text-smoke">
                <span
                  aria-hidden="true"
                  className="block h-[4px] w-[4px] shrink-0 rotate-45 bg-amethyst shadow-[0_0_8px_1px_rgba(124,106,156,0.6)]"
                />
                <span className="truncate">{product.crystal}</span>
              </p>
            ) : null
          ) : (
            <p className="label-sm mt-2.5 text-smoke">{product.scent}</p>
          )}

          <p
            className={[
              'flex items-baseline gap-2 tabular-nums text-wax',
              compact ? 'mt-2 text-[13px]' : 'mt-3.5 text-[14px] gap-2.5',
            ].join(' ')}
          >
            {formatMoney(product.effectivePriceCents)}
            {product.discounted ? (
              <span className="text-[11.5px] text-smoke line-through">
                {formatMoney(product.priceCents)}
              </span>
            ) : null}
            {!compact ? (
              <span className="text-[12px] text-smoke">· {product.sizeOz} oz</span>
            ) : null}
          </p>
        </div>
      </Link>
    </article>
  )
}
