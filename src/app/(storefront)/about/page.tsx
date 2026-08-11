import type { Metadata } from 'next'
import Image from 'next/image'
import { MoonMark } from '@/components/brand/Wordmark'
import { ButtonLink } from '@/components/ui/Button'
import { LitSection } from '@/components/visual/LitSection'

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'Hennys M. Homemade Candles is one person, pouring soy wax in small batches and setting every crystal by hand.',
}

export default function AboutPage() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-wax/8 bg-obsidian">
        {/* Individual edges — see the note in Hero.tsx on inset-0 conflicts. */}
        <div className="relative h-[38svh] min-h-[260px] w-full lg:absolute lg:bottom-0 lg:left-[50%] lg:right-0 lg:top-0 lg:h-auto lg:w-auto lg:min-h-0">
          <Image
            src="/images/brand/hennys-forest.jpeg"
            alt="Hennys photographed among the trees"
            fill
            priority
            quality={86}
            sizes="(max-width: 1023px) 100vw, 52vw"
            className="cinematic object-cover object-[60%_center]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-obsidian to-transparent lg:hidden"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                'linear-gradient(to right, #0b0b0f 0%, #0b0b0f 8%, rgba(11,11,15,0.7) 24%, rgba(11,11,15,0) 62%)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 lg:min-h-[62svh] lg:py-28">
          <div className="max-w-[34rem]">
            <p className="label text-gild/90">Our story</p>
            <h1 className="display-lg mt-5 text-wax">
              One person, <span className="italic text-gild">one pour at a time</span>
            </h1>
            <p className="lede mt-6 max-w-[44ch]">
              Hennys M. Homemade Candles is not a factory with a founder&rsquo;s
              photograph on the about page. It is Hennys, a studio, and a lot of wax.
            </p>
          </div>
        </div>
      </header>

      <LitSection glow className="bg-obsidian px-5 py-24 sm:px-8">
        <div className="relative mx-auto max-w-3xl">
          <blockquote className="reveal border-l border-gild/40 pl-7">
            <p className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2.25rem)] italic leading-[1.4] text-wax/92">
              &ldquo;I created Hennys M. Homemade Candles out of my love for cozy
              spaces, meaningful moments, and the power of scent to transform your
              day.&rdquo;
            </p>
          </blockquote>

          <div className="prose-hm reveal mt-12 text-[16.5px] leading-[1.85] text-wax/78">
            <p>
              Every candle is hand-poured with care, using quality ingredients and a
              touch of magic — because you deserve the very best.
            </p>
            <p>
              It began the way most of these things do: a love of cozy rooms, of the
              moment a scent changes how an evening feels, and a suspicion that the
              candles on the shelf were not made by anyone in particular. So I started
              pouring my own. Then friends wanted them. Then their friends did.
            </p>
            <p>
              The crystals came later, and they were not a marketing decision. I had
              always kept stones on windowsills, and setting them into the surface of
              the wax while it was still warm felt obvious once I tried it. They are
              real, they are chosen for each scent, and when the candle is finished you
              lift yours out and keep it. That part matters to me.
            </p>
            <p>
              Everything is still made in small batches. I pour, I set the stones, I
              label each tin, and I pack every order. It means a scent sometimes sells
              out and stays out for a week or two while I catch up. I would rather that
              than pour something I would not burn in my own home.
            </p>
            <p className="text-wax/88">
              Thank you for being here and supporting my small business.
            </p>
          </div>

          <div className="reveal mt-16 flex flex-col items-center gap-6 border-t border-wax/12 pt-14 text-center">
            <MoonMark size={96} className="opacity-90" />
            <p className="label text-gild/85">Bring light to your life</p>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <ButtonLink href="/products" size="md">
                Explore the collection
              </ButtonLink>
              <ButtonLink href="/contact" variant="quiet">
                Get in touch
              </ButtonLink>
            </div>
          </div>
        </div>
      </LitSection>
    </>
  )
}
