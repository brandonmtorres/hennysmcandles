export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  tone = 'dark',
}: {
  eyebrow?: string
  title: React.ReactNode
  lede?: string
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
}) {
  const centered = align === 'center'
  const titleColor = tone === 'light' ? 'text-obsidian' : 'text-wax'
  const ledeColor = tone === 'light' ? 'text-obsidian/62' : ''
  const eyebrowColor = tone === 'light' ? 'text-gild-deep' : 'text-gild/90'

  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className={`label reveal ${eyebrowColor}`}>{eyebrow}</p>
      ) : null}
      <h2
        className={`display-lg reveal mt-5 ${titleColor}`}
        style={{ '--reveal-delay': '80ms' } as React.CSSProperties}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={`lede reveal mt-6 ${ledeColor}`}
          style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
        >
          {lede}
        </p>
      ) : null}
    </div>
  )
}
