import Image from 'next/image'
import { LitSection } from '@/components/visual/LitSection'

/**
 * The differentiator section.
 *
 * Most candle brands sell a scent. Hennys sets raw crystals into the surface
 * of the wax by hand, which is the one thing a competitor cannot copy quickly
 * — so it gets an annotated photograph rather than a bullet list.
 *
 * On desktop the annotations sit over the image; below `lg` they collapse into
 * the same content as a readable list, so nothing depends on hover or on
 * pixel-accurate positioning at small sizes.
 */

type Part = {
  name: string
  detail: string
  /** Position over the photograph, when annotated. */
  pin?: { x: string; y: string; side: 'left' | 'right' }
}

/**
 * Only three of the four are pinned to the photograph. A fourth pin on the
 * left ran its label off the edge of the frame, and three reads calmer anyway
 * — the written list below carries the complete set.
 */
const PARTS: Part[] = [
  {
    name: 'Raw crystal',
    detail:
      'Amethyst, tourmaline, quartz or carnelian — pressed into the surface while the wax is still warm so it sets in place.',
    pin: { x: '62%', y: '20%', side: 'right' },
  },
  {
    name: 'Cotton wick',
    detail: 'Lead-free and untreated. Twin wicks on the 8 oz so the pool reaches the edge.',
    pin: { x: '46%', y: '34%', side: 'left' },
  },
  {
    name: 'Dried botanicals',
    detail: 'Rosebuds, lavender and eucalyptus, dried in the studio and placed by hand.',
  },
  {
    name: '100% soy wax',
    detail:
      'Natural, renewable, and slow-burning. No paraffin, no dyes, and phthalate-free fragrance oil.',
    pin: { x: '58%', y: '62%', side: 'right' },
  },
]

export function WhatsInside() {
  return (
    <LitSection
      className="veil-deep border-t border-wax/8 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="inside-heading"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        {/* Annotated photograph */}
        <div className="reveal relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-pitch">
            <Image
              src="/images/products/amethyst-moon.jpeg"
              alt="An open Hennys M. candle showing amethyst and dried rosebuds set into the soy wax"
              fill
              quality={86}
              sizes="(max-width: 1023px) 92vw, 48vw"
              className="cinematic object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pitch/45 via-transparent to-transparent"
            />

            {/* Desktop annotations */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
              {PARTS.filter((p) => p.pin).map((part, i) => (
                <span
                  key={part.name}
                  className="absolute"
                  style={{
                    left: part.pin!.x,
                    top: part.pin!.y,
                    animation: 'rise 900ms cubic-bezier(0.22,0.61,0.36,1) both',
                    animationDelay: `${300 + i * 140}ms`,
                  }}
                >
                  <span className="relative flex items-center">
                    <span className="block h-[7px] w-[7px] rounded-full bg-gild shadow-[0_0_0_4px_rgba(200,161,90,0.16)]" />
                    <span
                      className={[
                        'absolute top-1/2 h-px w-14 bg-gradient-to-r from-gild/70 to-gild/10',
                        part.pin!.side === 'right' ? 'left-2' : 'right-2 rotate-180',
                      ].join(' ')}
                    />
                    <span
                      className={[
                        'label-sm absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-wax/90',
                        part.pin!.side === 'right' ? 'left-[4.5rem]' : 'right-[4.5rem]',
                      ].join(' ')}
                    >
                      {part.name}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </div>

          <p className="label-sm mt-4 text-smoke">
            Amethyst Moon · ritual edition · 8 oz
          </p>
        </div>

        {/* Written detail */}
        <div>
          <p className="label reveal text-gild/90">What is inside</p>
          <h2
            className="display-lg reveal mt-5 text-wax"
            id="inside-heading"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            Four things, <span className="script text-gild">nothing else</span>
          </h2>
          <p
            className="lede reveal mt-6 max-w-[48ch]"
            style={{ '--reveal-delay': '150ms' } as React.CSSProperties}
          >
            No paraffin, no dyes, no synthetic wax blends. What goes into the tin is
            short enough to list in full — so here it is.
          </p>

          <dl className="mt-12">
            {PARTS.map((part, i) => (
              <div
                key={part.name}
                className="reveal border-t border-wax/12 py-6 first:border-t-0 first:pt-0"
                style={{ '--reveal-delay': `${180 + i * 90}ms` } as React.CSSProperties}
              >
                <dt className="display-sm text-wax">{part.name}</dt>
                <dd className="mt-2.5 max-w-[52ch] text-[14.5px] leading-relaxed text-smoke">
                  {part.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </LitSection>
  )
}
