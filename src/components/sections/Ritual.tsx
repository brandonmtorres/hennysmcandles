import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'

/**
 * The page's one bright section — the point in the scroll where the light has
 * fully arrived. The ground is the colour of the poured wax itself, so the
 * palette shift comes from the product rather than from decoration.
 *
 * These steps are a genuine sequence, which is why they are numbered here and
 * nowhere else on the page.
 */

const STEPS = [
  {
    step: 'One',
    title: 'The first burn decides the rest',
    body: 'Let the melted pool reach the full edge of the tin before you put it out — two to three hours. Wax remembers its first pool, and a short first burn is what makes a candle tunnel down the middle for the rest of its life.',
  },
  {
    step: 'Two',
    title: 'Trim before every light',
    body: 'Take the wick back to about a quarter inch. A long wick burns hot and smoky and eats through the scent; a short one keeps the flame low, the throw even, and the wax clean.',
  },
  {
    step: 'Three',
    title: 'Keep the crystal',
    body: 'When the wax is spent, warm the tin in your hands and lift the crystal out. Rinse it, keep it on a windowsill or in a pocket. The candle is finished — the stone is not.',
  },
]

export function Ritual() {
  return (
    <section
      /* The brightest point of the page. ScrollChoreography measures its
         distance from the viewport centre to drive `--dawn`, so the whole
         document warms on approach and cools again afterwards. */
      data-dawn-anchor
      className="relative overflow-hidden px-5 pb-32 pt-32 text-obsidian sm:px-8 sm:pb-40 sm:pt-44"
      aria-labelledby="ritual-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="label reveal text-obsidian/60">The ritual</p>
            <h2
              className="display-lg reveal mt-5 text-obsidian"
              id="ritual-heading"
              style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
            >
              How to burn it<span className="script script-ink text-gild-deep"> properly</span>
            </h2>
            <p
              className="reveal mt-6 max-w-[42ch] text-[17px] leading-relaxed text-obsidian/80"
              style={{ '--reveal-delay': '150ms' } as React.CSSProperties}
            >
              A hand-poured candle behaves differently from a supermarket one.
              Three habits will roughly double what you get out of it.
            </p>

            <div
              className="reveal relative mt-12 hidden aspect-[4/3] overflow-hidden lg:block"
              style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
            >
              <Image
                src="/images/products/starry-christmas-night-lit.jpeg"
                alt="A gold Hennys M. candle burning beside an open book"
                fill
                quality={84}
                sizes="40vw"
                className="object-cover"
              />
            </div>
          </div>

          <ol className="flex flex-col">
            {STEPS.map((item, i) => (
              <li
                key={item.step}
                className="reveal border-t border-obsidian/20 py-10 first:border-t-0 first:pt-0"
                style={{ '--reveal-delay': `${i * 110}ms` } as React.CSSProperties}
              >
                <p className="label text-obsidian/55">{item.step}</p>
                <h3 className="display-md mt-4 text-obsidian">{item.title}</h3>
                <p className="mt-4 max-w-[56ch] text-[15.5px] leading-[1.75] text-obsidian/80">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="reveal mt-16 flex flex-wrap items-center gap-6 border-t border-obsidian/20 pt-10">
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-obsidian/80">
            Every order ships with a printed card of this, in case you forget.
          </p>
          <ButtonLink href="/ritual" variant="onLightOutline" size="sm">
            Read the full guide
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
