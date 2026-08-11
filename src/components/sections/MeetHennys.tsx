import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'
import { LitSection } from '@/components/visual/LitSection'

/**
 * The maker. The copy here is Hennys' own, kept close to how she wrote it —
 * an owner's voice is worth more than a polished brand paragraph.
 */
export function MeetHennys() {
  return (
    <LitSection
      glow
      className="bg-obsidian px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="hennys-heading"
    >
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
        <div className="reveal relative">
          <div className="relative aspect-[3/4] overflow-hidden bg-ash">
            <Image
              src="/images/brand/hennys-hooded.jpeg"
              alt="Hennys holding one of her lit candles"
              fill
              quality={86}
              sizes="(max-width: 1023px) 92vw, 40vw"
              className="cinematic object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/55 via-transparent to-transparent"
            />
          </div>
          <p className="label-sm mt-4 text-smoke">Hennys · founder and sole chandler</p>
        </div>

        <div>
          <p className="label reveal text-gild/90">The maker</p>
          <h2
            className="display-lg reveal mt-5 text-wax"
            id="hennys-heading"
            style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
          >
            Hi, <span className="italic text-gild">I&rsquo;m Hennys</span>
          </h2>

          <blockquote
            className="reveal mt-9 border-l border-gild/40 pl-7"
            style={{ '--reveal-delay': '150ms' } as React.CSSProperties}
          >
            <p className="font-[family-name:var(--font-display)] text-[clamp(1.375rem,2.4vw,1.875rem)] italic leading-[1.42] text-wax/92">
              &ldquo;I started Hennys M. out of my love for cozy spaces, meaningful
              moments, and the power of scent to transform your day.&rdquo;
            </p>
          </blockquote>

          <div
            className="prose-hm reveal mt-9 max-w-[54ch] text-[15.5px] leading-[1.78] text-smoke"
            style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
          >
            <p>
              Every candle is hand-poured with care, using quality ingredients and a
              touch of magic — because you deserve the very best. I pour in small
              batches from my studio, set each crystal myself, and label every tin by
              hand.
            </p>
            <p>
              It means a scent sometimes sells out and stays out for a week or two.
              I would rather that than pour something I would not burn in my own home.
            </p>
            <p className="text-wax/80">Thank you for being here and supporting my small business.</p>
          </div>

          <div
            className="reveal mt-10 flex flex-wrap items-center gap-5"
            style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
          >
            <ButtonLink href="/about" variant="outline" size="md">
              Read the full story
            </ButtonLink>
            <a
              href="https://instagram.com/hennysm.candles"
              target="_blank"
              rel="noreferrer noopener"
              className="label-sm text-smoke underline decoration-wax/20 underline-offset-[6px] transition-colors hover:text-gild hover:decoration-gild"
            >
              Follow along @hennysm.candles
            </a>
          </div>
        </div>
      </div>
    </LitSection>
  )
}
