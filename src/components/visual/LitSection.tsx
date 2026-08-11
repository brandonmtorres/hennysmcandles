import type { CSSProperties } from 'react'

/**
 * A section that participates in the travelling light.
 *
 * `--warmth` is rendered here on the server with its resting value so the
 * markup React hydrates against already carries the property. Without that,
 * `ScrollChoreography` writing the same property after mount reads as a
 * hydration mismatch — React owns the style attribute, so it must know about
 * it from the start.
 */
export function LitSection({
  children,
  className = '',
  glow = false,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  /** Adds the soft pool of candlelight that warms as the light arrives. */
  glow?: boolean
} & Omit<React.ComponentPropsWithoutRef<'section'>, 'style'>) {
  return (
    <section
      data-lit
      style={{ '--warmth': 0 } as CSSProperties}
      className={[glow ? 'lightfall' : '', 'relative overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </section>
  )
}
