import type { CSSProperties } from 'react'

/**
 * An accent word set in the wordmark's own script.
 *
 * A component rather than a bare `className="script"` so the shop has one
 * place that decides how its accent type behaves — the styling, the ink
 * variant for the cream ground, and anything that might later be done to it.
 */
export function ScriptText({
  children,
  ink = false,
  className = '',
  style,
}: {
  children: React.ReactNode
  /** On the cream ground, where a bloom would turn muddy. */
  ink?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={['script', ink ? 'script-ink' : '', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </span>
  )
}
