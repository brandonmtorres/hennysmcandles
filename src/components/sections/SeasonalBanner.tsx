import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { CatSilhouette, MotifGlyph } from '@/components/visual/SeasonalMotifs'
import { SeasonalWeather } from '@/components/visual/SeasonalWeather'
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
 * Built as a scene in layers: a two-stop ground, a pool of light rising from
 * the lower edge, a large motif bleeding off the right, scattered small marks,
 * and the season's own weather drifting through all of it. The type carries
 * the same script the wordmark uses, and the cat sits in the corner wearing
 * one small seasonal thing.
 *
 * `preview` renders the same component at reduced scale for the portal, so
 * what the owner approves is exactly what customers get.
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

  const custom = data.bannerHeading.trim()
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
      style={{ background: `linear-gradient(168deg, ${theme.from} 0%, ${theme.to} 100%)` }}
    >
      {/* Light rising from the lower edge, as if from the candles themselves. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 78% at 26% 108%, ${theme.glow}38, transparent 66%)`,
        }}
      />
      {/* A cooler counter-light from the top right, for depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(70% 55% at 92% -10%, ${theme.accentSoft}26, transparent 60%)`,
        }}
      />

      {/* The large motif, bleeding off the right edge. */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute',
          preview ? '-right-6 top-2 h-28 w-28' : '-right-10 top-4 h-64 w-64 sm:h-80 sm:w-80 lg:-right-16 lg:h-[26rem] lg:w-[26rem]',
        ].join(' ')}
        style={{ color: theme.accent, opacity: 0.13, transform: 'rotate(-12deg)' }}
      >
        <MotifGlyph motif={theme.hero} className="h-full w-full" />
      </div>

      {/* Scattered small marks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ color: theme.accent }}>
        {theme.motifs.map((motif, i) => {
          const spots = [
            { top: '14%', left: '52%', size: preview ? 12 : 26, opacity: 0.22, rotate: -14 },
            { top: '68%', left: '61%', size: preview ? 9 : 18, opacity: 0.16, rotate: 18 },
            { top: '34%', left: '78%', size: preview ? 10 : 20, opacity: 0.14, rotate: 6 },
            { top: '82%', left: '43%', size: preview ? 8 : 15, opacity: 0.13, rotate: -22 },
          ]
          const spot = spots[i % spots.length]!
          return (
            <span
              key={`${motif}-${i}`}
              className="absolute"
              style={{
                top: spot.top,
                left: spot.left,
                opacity: spot.opacity,
                transform: `rotate(${spot.rotate}deg)`,
              }}
            >
              <MotifGlyph motif={motif} style={{ width: spot.size, height: spot.size }} />
            </span>
          )
        })}
      </div>

      {/* The season's weather. */}
      <SeasonalWeather
        weather={theme.weather}
        colour={theme.accentSoft}
        density={preview ? 0.45 : 1}
      />

      <div
        className={[
          'relative mx-auto max-w-7xl',
          preview ? 'px-6 py-8' : 'px-5 py-16 sm:px-8 sm:py-24',
        ].join(' ')}
      >
        {/* Eyebrow */}
        <p
          className={[
            'flex items-center gap-2.5',
            preview ? 'text-[8px] uppercase tracking-[0.28em]' : 'label',
          ].join(' ')}
          style={{ color: theme.accent }}
        >
          <span aria-hidden="true" className="inline-block">
            <MotifGlyph
              motif={theme.divider}
              style={{ width: preview ? 9 : 13, height: preview ? 9 : 13 }}
            />
          </span>
          {theme.eyebrow}
          {promoLive ? ` · ${data.salePercent}% off everything` : ''}
        </p>

        {/* Heading — the second phrase in the wordmark's own script. */}
        <h2
          id={preview ? undefined : 'seasonal-heading'}
          className={[
            'text-wax',
            preview
              ? 'mt-2 font-[family-name:var(--font-display)] text-[19px] leading-tight'
              : 'display-lg mt-5 max-w-[15ch]',
          ].join(' ')}
        >
          {custom ? (
            custom
          ) : (
            <>
              {theme.headingLead}{' '}
              <span className="script" style={{ color: theme.accent }}>
                {theme.headingAccent}
              </span>
            </>
          )}
        </h2>

        <p
          className={[
            'text-wax/75',
            preview
              ? 'mt-1.5 line-clamp-2 text-[11px] leading-snug'
              : 'mt-6 max-w-[52ch] text-[16px] leading-relaxed',
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
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <ButtonLink href={`/collections/${data.slug}`} size="lg">
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

        {/* A rule broken by the season's own glyph. */}
        {showcase.length > 0 ? (
          <div
            aria-hidden="true"
            className={preview ? 'mt-6 flex items-center gap-3' : 'mt-14 flex items-center gap-5'}
            style={{ color: theme.accent }}
          >
            <span className="h-px flex-1" style={{ background: `${theme.accent}30` }} />
            <MotifGlyph
              motif={theme.divider}
              style={{ width: preview ? 11 : 18, height: preview ? 11 : 18, opacity: 0.7 }}
            />
            <span className="h-px flex-1" style={{ background: `${theme.accent}30` }} />
          </div>
        ) : null}

        {/* Candles */}
        {showcase.length > 0 ? (
          <ul
            className={[
              'grid',
              preview ? 'mt-5 grid-cols-3 gap-3' : 'mt-12 grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-7',
            ].join(' ')}
          >
            {showcase.map((product) => (
              <li key={product.id}>
                <Link
                  href={preview ? '#' : `/products/${product.slug}`}
                  tabIndex={preview ? -1 : undefined}
                  className="group block"
                >
                  <span
                    className="relative block aspect-[3/4] overflow-hidden"
                    style={{ background: `${theme.from}cc` }}
                  >
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={preview ? '' : product.images[0].alt}
                        fill
                        sizes={preview ? '120px' : '(max-width: 639px) 44vw, 20vw'}
                        className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
                      />
                    ) : null}
                    {/* A wash of the theme colour ties the photography in. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 mix-blend-soft-light"
                      style={{ background: theme.glow, opacity: 0.22 }}
                    />
                  </span>
                  {!preview ? (
                    <>
                      <span className="mt-3.5 block min-h-[2.4em] font-[family-name:var(--font-display)] text-[16px] leading-[1.2] text-wax">
                        {product.name}
                      </span>
                      <span className="mt-1 flex items-baseline gap-2 text-[13px] tabular-nums text-wax/70">
                        {formatMoney(product.effectivePriceCents)}
                        {product.discounted ? (
                          <span className="text-[11.5px] line-through opacity-70">
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

      {/* The cat, small and once, wearing one seasonal thing. */}
      <CatSilhouette
        accessory={theme.cat}
        accessoryColour={theme.accent}
        className={[
          'pointer-events-none absolute bottom-0 select-none',
          preview ? 'right-4 h-8 w-8' : 'right-6 h-16 w-16 sm:right-12 sm:h-20 sm:w-20',
        ].join(' ')}
        style={{ color: theme.from, opacity: 0.75 }}
      />
    </section>
  )
}
