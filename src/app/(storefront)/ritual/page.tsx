import type { Metadata } from 'next'
import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'The Ritual',
  description:
    'How to burn a hand-poured soy candle properly: the first burn, trimming the wick, and what to do with the crystal when the wax is spent.',
}

const STEPS = [
  {
    step: 'One',
    title: 'The first burn decides the rest',
    body: 'Let the melted pool reach the full edge of the tin before you put it out — two to three hours. Wax has a memory: if the first burn stops short, every burn after it will tunnel down the middle and leave a wall of unused wax behind.',
  },
  {
    step: 'Two',
    title: 'Trim before every light',
    body: 'Take the wick back to about a quarter inch. A long wick burns hot, smokes, and races through the fragrance oil. A short one keeps the flame low and steady, the scent even, and the wax clean rather than sooty.',
  },
  {
    step: 'Three',
    title: 'Three to four hours, no longer',
    body: 'Past about four hours the vessel gets hot enough to affect the burn and the scent flattens out. Put it out, let it set, and light it again later. You will get noticeably more hours from the candle this way.',
  },
  {
    step: 'Four',
    title: 'Keep the crystal',
    body: 'When the wax is spent, warm the tin in your hands or run it under hot water and lift the crystal out. Rinse it and keep it — on a windowsill, in a pocket, wherever. The candle is finished; the stone is not.',
  },
]

const SAFETY = [
  'Never leave a burning candle unattended.',
  'Keep away from children, pets, and anything that catches.',
  'Burn on a heat-safe surface, away from draughts.',
  'Stop burning when about 10 mm of wax remains.',
  'The crystals and botanicals sit in the wax, not in the flame — keep them clear of the wick.',
]

export default function RitualPage() {
  return (
    <>
      <header className="bg-wax px-5 pb-16 pt-16 text-obsidian sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="label text-gild-deep">The ritual</p>
          <h1 className="display-lg mt-5 max-w-[16ch] text-obsidian">
            How to burn it <span className="script script-ink text-gild-deep">properly</span>
          </h1>
          <p className="mt-6 max-w-[54ch] text-[17px] leading-relaxed text-obsidian/65">
            A hand-poured candle behaves differently from a supermarket one. Four
            habits will roughly double what you get out of it — and the last one you
            keep.
          </p>
        </div>
      </header>

      <section className="bg-wax px-5 pb-24 text-obsidian sm:px-8 sm:pb-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="/images/products/ginger-apple-spice.jpeg"
                alt="A match held above the twin wicks of a Hennys M. candle"
                fill
                quality={86}
                sizes="(max-width: 1023px) 92vw, 42vw"
                className="object-cover"
              />
            </div>
            <p className="label-sm mt-4 text-obsidian/45">
              Ginger Apple Spice · first light
            </p>
          </div>

          <ol className="flex flex-col">
            {STEPS.map((item, i) => (
              <li
                key={item.step}
                className="reveal border-t border-obsidian/12 py-10 first:border-t-0 first:pt-0"
                style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
              >
                <p className="label text-gild-deep">{item.step}</p>
                <h2 className="display-md mt-4 text-obsidian">{item.title}</h2>
                <p className="mt-4 max-w-[58ch] text-[15.5px] leading-[1.78] text-obsidian/70">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="veil-deep border-t border-wax/8 px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="label reveal text-gild/90">Burn safely</p>
            <h2 className="display-md reveal mt-5 text-wax">
              The unglamorous part
            </h2>
            <p className="lede reveal mt-5 max-w-[44ch]">
              None of this is exciting, but a candle is an open flame in your home.
            </p>
          </div>
          <ul className="flex flex-col">
            {SAFETY.map((rule, i) => (
              <li
                key={rule}
                className="reveal flex gap-4 border-t border-wax/12 py-5 first:border-t-0 first:pt-0"
                style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
              >
                <span className="mt-2 block h-1 w-1 shrink-0 rounded-full bg-gild" aria-hidden="true" />
                <span className="text-[15px] leading-relaxed text-wax/80">{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-20 flex max-w-7xl flex-wrap items-center gap-5 border-t border-wax/12 pt-12">
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-smoke">
            Every order ships with a printed card of this, in case you forget.
          </p>
          <ButtonLink href="/products" size="md">
            Explore the collection
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
