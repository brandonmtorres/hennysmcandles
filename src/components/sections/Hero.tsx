import Image from 'next/image'
import { Atmosphere } from '@/components/visual/Atmosphere'
import { ButtonLink } from '@/components/ui/Button'
import { pluralise, spell } from '@/lib/words'

/**
 * First viewport.
 *
 * A real photograph carries the frame; the canvas over it supplies embers and
 * a breathing glow. Augmenting real photography reads as believable where a
 * drawn flame reads as synthetic.
 *
 * Two distinct compositions rather than one that bends:
 *  · desktop — photograph occupies the right half, type sits on obsidian
 *  · mobile  — photograph is a band at the top, type sits below it on solid
 *              ground. Overlaying type on the candle made both unreadable.
 */
export function Hero({ scentCount }: { scentCount: number }) {
  return (
    <section className="relative overflow-hidden lg:min-h-[100svh]">
      {/* Photograph */}
      {/*
        Edges are set individually rather than with `inset-0` plus a `left`
        override: both are the same specificity, so Tailwind's stylesheet
        order decides the winner and `inset-0` silently flattened the split
        into a full-bleed image.
      */}
      <div className="relative h-[34svh] min-h-[252px] w-full lg:absolute lg:bottom-0 lg:left-[46%] lg:right-0 lg:top-0 lg:h-auto lg:w-auto lg:min-h-0">
        <Image
          src="/images/products/black-sea-mist-hero.jpeg"
          alt="A Hennys M. Black Sea Mist candle burning beside a piece of raw black tourmaline"
          fill
          priority
          quality={90}
          sizes="(max-width: 1023px) 100vw, 60vw"
          /*
            The photograph dissolves via a mask rather than a painted scrim, so
            the night sky behind shows through the fade. The desktop fade is
            long and starts from nothing — a short, hard fade is what made the
            two columns read as separate panels.
          */
          className="object-cover object-center contrast-[1.03] saturate-[0.97] [mask-image:linear-gradient(to_bottom,black_0%,black_58%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.06)_16%,rgba(0,0,0,0.28)_30%,rgba(0,0,0,0.62)_44%,rgba(0,0,0,0.88)_58%,black_72%)]"
        />

        {/*
          Depth at the top and bottom of the photograph. This carries the same
          horizontal mask as the image — an unmasked overlay painted a dark
          band starting exactly at the panel's left edge, which is what made
          the two columns look like separate panels butted together.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block lg:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.06)_16%,rgba(0,0,0,0.28)_30%,rgba(0,0,0,0.62)_44%,rgba(0,0,0,0.88)_58%,black_72%)]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(6,6,8,0.45) 0%, rgba(6,6,8,0) 26%, rgba(6,6,8,0) 74%, rgba(6,6,8,0.35) 100%)',
          }}
        />
      </div>

      {/*
        A single ember field across the whole hero rather than one per column.
        Embers are born at the flame on the right and drift left over the type,
        which is what makes the two halves read as one frame.
      */}
      <Atmosphere
        sourceX={0.78}
        sourceY={0.52}
        emberCount={26}
        drift={-0.3}
        className="hidden lg:block"
      />
      <Atmosphere
        sourceX={0.5}
        sourceY={0.2}
        emberCount={16}
        drift={-0.12}
        className="lg:hidden"
      />

      {/* Type */}
      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-9 sm:px-8 sm:pb-20 lg:flex lg:min-h-[100svh] lg:items-center lg:pb-28 lg:pt-28">
        <div className="w-full max-w-[36rem] lg:max-w-[30rem] xl:max-w-[34rem]">
          <p
            className="label text-gild/90"
            style={{ animation: 'rise 900ms cubic-bezier(0.22,0.61,0.36,1) both' }}
          >
            Hand-poured · Set with raw crystals
          </p>

          <h1 className="display-xl rise mt-5 text-wax sm:mt-6">
            <span style={{ '--rise-delay': '120ms' } as React.CSSProperties}>Bring light</span>
            <span
              className="script text-gild"
              style={{ '--rise-delay': '260ms' } as React.CSSProperties}
            >
              to your life
            </span>
          </h1>

          <p
            className="lede mt-6 max-w-[46ch] sm:mt-8"
            style={{
              animation: 'rise 1000ms cubic-bezier(0.22,0.61,0.36,1) both',
              animationDelay: '440ms',
            }}
          >
            Soy wax poured by hand, a cotton wick, and a raw crystal set into the
            surface while the wax is still warm.{' '}
            {scentCount > 0 ? (
              <>
                {spell(scentCount).replace(/^\w/, (c) => c.toUpperCase())}{' '}
                {pluralise(scentCount, 'scent')}, made a few dozen at a time.
              </>
            ) : (
              'Made a few dozen at a time.'
            )}
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-11"
            style={{
              animation: 'rise 1000ms cubic-bezier(0.22,0.61,0.36,1) both',
              animationDelay: '600ms',
            }}
          >
            <ButtonLink href="/products" size="lg" className="max-sm:w-full">
              Explore the collection
            </ButtonLink>
            <ButtonLink href="/about" variant="quiet">
              Meet Hennys
            </ButtonLink>
          </div>

          <ul
            className="mt-10 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-wax/12 pt-6 sm:mt-14 sm:pt-7"
            style={{
              animation: 'rise 1000ms cubic-bezier(0.22,0.61,0.36,1) both',
              animationDelay: '760ms',
            }}
          >
            {['100% soy wax', '45-hour burn', 'Crystal set by hand'].map((item) => (
              <li key={item} className="label-sm text-smoke">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  )
}
