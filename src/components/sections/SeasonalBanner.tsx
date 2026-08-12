import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { CatSilhouette, MotifGlyph } from '@/components/visual/SeasonalMotifs'
import { getTheme } from '@/lib/themes'
import { formatMoney } from '@/lib/money'
import type { ProductCard } from '@/lib/products'

export type SeasonalBannerData = {
  slug: string
  name: string
  theme: string
  bannerHeading: string
  bannerBody: string
  salePercent: number
  saleActive: boolean
  products: ProductCard[]
}

/**
 * A themed band for a seasonal collection.
 *
 * Rendered inside its own stacking context with its own gradient, so it sits
 * on the night like a lit window rather than replacing the page's identity.
 * The motifs are few and small, and the cat appears once, at roughly the
 * height of a line of body text.
 *
 * `preview` renders the same markup at reduced scale for the portal, so what
 * the owner approves is what customers get — not an approximation of it.
 */
export function SeasonalBanner({
  data,
  preview = false,
}: {
  data: SeasonalBannerData
  preview?: boolean
}) {
  const theme = getTheme(data.theme)
  if (!theme) return null

  const heading = data.bannerHeading.trim() || theme.heading
  const body = data.bannerBody.trim() || theme.body
  const promoLive = data.saleActive && data.salePercent > 0
  const showcase = data.products.slice(0, preview ? 3 : 4)

  return (
    <section
      aria-labelledby={preview ? undefined : 'seasonal-heading'}
      className={[
        'relative isolate overflow-hidden',
        preview ? 'rounded-[2px]' : 'border-y border-wax/10',
      ].join(' ')}
      style={{
        background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
      }}
    >
      {/* A soft light from the upper left, so the band is not a flat fill. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(80% 60% at 18% 0%, ${theme.accent}22, transparent 62%)`,
        }}
      />

      {/* Motifs, scattered but placed — never behind the type. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ color: theme.accent }}
      >
        {theme.motifs.map((motif, i) => {
          const spots = [
            { top: '12%', right: '6%', size: preview ? 22 : 42, opacity: 0.3, rotate: -12 },
            { top: '58%', right: '17%', size: preview ? 15 : 28, opacity: 0.22, rotate: 14 },
            { top: '30%', right: '28%', size: preview ? 12 : 22, opacity: 0.16, rotate: -4 },
            { top: '74%', right: '4%', size: preview ? 13 : 24, opacity: 0.18, rotate: 20 },
          ]
          const spot = spots[i % spots.length]!
          return (
            <span
              key={`${motif}-${i}`}
              className="absolute"
              style={{
                top: spot.top,
                right: spot.right,
                opacity: spot.opacity,
                transform: `rotate(${spot.rotate}deg)`,
              }}
            >
              {/* Sized inline: Tailwind cannot see a class name built at
                  runtime, so `h-[${'{'}size{'}'}px]` would compile to nothing. */}
              <MotifGlyph motif={motif} style={{ width: spot.size, height: spot.size }} />
            </span>
          )
        })}
      </div>

      <div
        className={[
          'relative mx-auto grid max-w-7xl items-center gap-10',
          preview ? 'px-6 py-8' : 'px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16',
        ].join(' ')}
      >
        {/* Words */}
        <div>
          <p
            className={preview ? 'text-[8px] uppercase tracking-[0.28em]' : 'label'}
            style={{ color: theme.accent }}
          >
            {theme.label}
            {promoLive ? ` · ${data.salePercent}% off` : ''}
          </p>

          <h2
            id={preview ? undefined : 'seasonal-heading'}
            className={[
              'text-wax',
              preview ? 'mt-2 font-[family-name:var(--font-display)] text-[19px] leading-tight' : 'display-md mt-4',
            ].join(' ')}
          >
            {heading}
          </h2>

          <p
            className={[
              'text-wax/72',
              preview
                ? 'mt-1.5 line-clamp-2 text-[11px] leading-snug'
                : 'mt-5 max-w-[46ch] text-[15.5px] leading-relaxed',
            ].join(' ')}
          >
            {body}
          </p>

          {preview ? (
            <span
              className="mt-3 inline-block rounded-[2px] px-3 py-1.5 text-[8px] uppercase tracking-[0.2em]"
              style={{ background: theme.accent, color: theme.from }}
            >
              Shop {data.name}
            </span>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <ButtonLink href={`/collections/${data.slug}`} size="md">
                Shop {data.name}
              </ButtonLink>
              <Link
                href="/products"
                className="label-sm text-wax/70 underline decoration-wax/25 underline-offset-[6px] transition-colors hover:text-wax"
              >
                See every candle
              </Link>
            </div>
          )}
        </div>

        {/* Candles */}
        {showcase.length > 0 ? (
          <ul
            className={[
              'grid gap-3',
              preview ? 'grid-cols-3' : 'grid-cols-2 gap-4 sm:grid-cols-4',
            ].join(' ')}
          >
            {showcase.map((product) => (
              <li key={product.id}>
                <Link
                  href={preview ? '#' : `/products/${product.slug}`}
                  tabIndex={preview ? -1 : undefined}
                  className="group block"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden bg-black/30">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={preview ? '' : product.images[0].alt}
                        fill
                        sizes={preview ? '120px' : '(max-width: 639px) 44vw, 15vw'}
                        className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]"
                      />
                    ) : null}
                  </span>
                  {!preview ? (
                    <>
                      {/* Wraps rather than truncating — "Starry Christmas
                          Night" lost its last word in a narrow column. */}
                      <span className="mt-3 block min-h-[2.4em] font-[family-name:var(--font-display)] text-[15px] leading-[1.2] text-wax">
                        {product.name}
                      </span>
                      <span className="mt-1 flex items-baseline gap-2 text-[12.5px] tabular-nums text-wax/70">
                        {formatMoney(product.effectivePriceCents)}
                        {product.discounted ? (
                          <span className="text-[11px] line-through opacity-70">
                            {formatMoney(product.priceCents)}
                          </span>
                        ) : null}
                      </span>
                    </>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* The cat, small and once — a personal touch, not a mascot. */}
      <CatSilhouette
        className={[
          'pointer-events-none absolute bottom-0 select-none',
          preview ? 'left-4 h-7 w-7' : 'left-6 h-14 w-14 sm:left-10 sm:h-16 sm:w-16',
        ].join(' ')}
        style={{ color: theme.from, opacity: 0.62 }}
      />
    </section>
  )
}
