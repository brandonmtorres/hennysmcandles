import Image from 'next/image'
import Link from 'next/link'

/**
 * Typographic lockup used in the header and footer.
 *
 * The set type mirrors Hennys' candle labels: a Didone in wide caps over
 * geometric small caps.
 */
export function Wordmark({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const scale = {
    sm: { name: 'text-[15px]', sub: 'text-[7px]', gap: 'mt-[3px]' },
    md: { name: 'text-[19px]', sub: 'text-[8px]', gap: 'mt-1' },
    lg: { name: 'text-[30px] sm:text-[38px]', sub: 'text-[10px]', gap: 'mt-2' },
  }[size]

  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span
        className={`font-[family-name:var(--font-display)] ${scale.name} tracking-[0.2em] text-wax`}
      >
        HENNYS M.
      </span>
      <span
        className={`${scale.sub} ${scale.gap} tracking-[0.42em] text-gild uppercase font-light`}
      >
        Homemade Candles
      </span>
    </span>
  )
}

/**
 * Hennys' actual logo — the full moon carrying the HM monogram with a cat
 * curled at its base.
 *
 * The source is a JPEG on a black ground. Rather than knocking that black out
 * with `mix-blend-mode` (which amplifies the compression artefacts around the
 * moon into a grey haze), `scripts/` pre-builds a transparent PNG whose alpha
 * comes from the artwork's own luminance. It composites cleanly on any dark
 * surface and stays crisp at small sizes.
 */
export function MoonMark({
  size = 120,
  className = '',
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/images/brand/logo-moon.png"
      alt="Hennys M. Homemade Candles"
      width={size}
      height={size}
      priority={priority}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/**
 * Header lockup.
 *
 * The moon artwork is deliberately omitted here — below roughly 60px the
 * monogram and cat turn to mud, which cheapens the mark. It appears at full
 * size in the footer and on the story page, where it can carry the detail.
 */
export function LogoLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Hennys M. Homemade Candles — home"
      className={`group inline-flex flex-col leading-none ${className}`}
    >
      <span className="font-[family-name:var(--font-display)] text-[17px] tracking-[0.22em] text-wax transition-colors duration-500 group-hover:text-gild sm:text-[19px]">
        HENNYS M.
      </span>
      <span className="mt-[5px] text-[7.5px] font-light uppercase tracking-[0.4em] text-gild/85 sm:text-[8px]">
        Homemade Candles
      </span>
    </Link>
  )
}
