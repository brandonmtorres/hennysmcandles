import type { CatAccessory, Motif } from '@/lib/themes'

/**
 * The drawn marks that dress a seasonal banner.
 *
 * All are single-path line work at a common 24-unit box so they sit together
 * at any size, and all take their colour from `currentColor` so a theme only
 * has to name one accent.
 */
export function MotifGlyph({
  motif,
  className = '',
  style,
}: {
  motif: Motif
  className?: string
  style?: React.CSSProperties
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  }

  switch (motif) {
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M20 4c0 8-5 14-12 15 0-8 5-14 12-15Z" />
          <path d="M8 19c2-4 5-7 9-9" />
        </svg>
      )
    case 'fir':
      return (
        <svg {...common}>
          <path d="M12 3 7 10h3l-4 6h5v5h2v-5h5l-4-6h3Z" />
        </svg>
      )
    case 'snow':
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
          <path d="M12 6.5 9.8 8.7M12 6.5l2.2 2.2M12 17.5l-2.2-2.2M12 17.5l2.2-2.2" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      )
    case 'shell':
      return (
        <svg {...common}>
          <path d="M12 21C6.5 21 3 16.5 3 11a9 9 0 0 1 18 0c0 5.5-3.5 10-9 10Z" />
          <path d="M12 21V4M12 21c-2.5-3-4-7-4.5-12M12 21c2.5-3 4-7 4.5-12" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6c0 5-7 9.4-7 9.4Z" />
        </svg>
      )
    case 'blossom':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 10c0-3 1.4-5 2.8-5S17 7 15 9.4M14 12c3 0 5 1.4 5 2.8S17 17 14.6 15M12 14c0 3-1.4 5-2.8 5S7 17 9 14.6M10 12c-3 0-5-1.4-5-2.8S7 7 9.4 9" />
        </svg>
      )
    case 'branch':
      return (
        <svg {...common}>
          <path d="M3 21C7 15 12 10 21 5" />
          <path d="M8.5 14.5c-.6-2.2-.2-4 1.2-5.4M12.5 10.6c-.3-2.3.4-4 2-5.2M6 17.6c-1.6-1.2-2.6-2.8-2.9-4.9M16.4 7.7c.5-2 1.7-3.4 3.4-4.2" />
        </svg>
      )
    case 'wreath':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4c1.6 1 2.4 2.2 2.4 3.6M20 12c-1 1.6-2.2 2.4-3.6 2.4M12 20c-1.6-1-2.4-2.2-2.4-3.6M4 12c1-1.6 2.2-2.4 3.6-2.4" />
        </svg>
      )
    case 'wave':
      return (
        <svg {...common}>
          <path d="M2 9c2.5-2.4 5-2.4 7.5 0S15 11.4 17.5 9 22 6.6 22 9" />
          <path d="M2 15c2.5-2.4 5-2.4 7.5 0s5.5 2.4 8-.1 4.5-2.3 4.5.1" />
        </svg>
      )
    case 'star':
    default:
      return (
        <svg {...common}>
          <path d="M12 3.5 13.9 9l5.6.4-4.3 3.7 1.4 5.5L12 15.6 7.4 18.6l1.4-5.5L4.5 9.4 10.1 9Z" />
        </svg>
      )
  }
}

/**
 * Hennys' cat, sitting.
 *
 * Kept deliberately small — the brief was a personal touch, not a mascot. It
 * appears once per banner, tucked into a lower corner at about the height of a
 * line of body text, filled rather than outlined so it reads as a silhouette
 * at that size.
 */
export function CatSilhouette({
  className = '',
  style,
  accessory = null,
  accessoryColour = '#ffffff',
}: {
  className?: string
  style?: React.CSSProperties
  /** A small seasonal detail — a hat, a leaf behind the ear, a bow. */
  accessory?: CatAccessory
  accessoryColour?: string
}) {
  return (
    <svg
      viewBox="0 0 64 72"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {/* Ears, head, body and front legs as one seated shape. */}
      <path d="M20.4 18.2 16.8 6.4a1 1 0 0 1 1.5-1.1l9.4 6.6a19 19 0 0 1 8.6 0l9.4-6.6a1 1 0 0 1 1.5 1.1l-3.6 11.8a16.2 16.2 0 0 1 5.4 12c0 4.6-2 8.7-5.2 11.6 3.6 3.6 5.8 8.4 5.8 13.6 0 2.4-.4 4.7-1.2 6.8a2 2 0 0 1-1.9 1.3H18.5a2 2 0 0 1-1.9-1.3 19.6 19.6 0 0 1-1.2-6.8c0-5.2 2.2-10 5.8-13.6A15.7 15.7 0 0 1 16 30.2c0-4.8 2-9.1 5.4-12Z" />
      {/* Tail, curling round the base. */}
      <path d="M45.6 62.6c4.6-.7 8.2-3.2 8.2-7.2 0-3-2-5.4-4.6-6.4a1.6 1.6 0 0 0-1.2 3c1.6.6 2.6 1.9 2.6 3.4 0 2-2.2 3.6-5.6 4.1a1.6 1.6 0 0 0 .6 3.1Z" />

      {/* The seasonal detail, drawn in the theme's accent so it reads against
          the silhouette. Small enough to be a wink, not a costume. */}
      <g fill={accessoryColour}>
        {accessory === 'hat' ? (
          <>
            <path d="M20 15.5c2-7 6.5-11 12-11s10 4 12 11c-7-3-17-3-24 0Z" />
            <rect x="18.5" y="14.5" width="27" height="4.4" rx="2.2" />
            <circle cx="46" cy="6.5" r="3.4" />
          </>
        ) : null}
        {accessory === 'leaf' ? (
          <path d="M46 14c0 5-3.2 8.6-8 9.4 0-5 3.2-8.6 8-9.4Z" />
        ) : null}
        {accessory === 'flower' ? (
          <g transform="translate(43 16)">
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={i}
                cx={Math.cos((i / 5) * Math.PI * 2) * 3.4}
                cy={Math.sin((i / 5) * Math.PI * 2) * 3.4}
                rx="2.6"
                ry="1.8"
                transform={`rotate(${(i / 5) * 360})`}
              />
            ))}
          </g>
        ) : null}
        {accessory === 'bow' ? (
          <>
            <path d="M38 20.5c-3.5-2.6-6.5-2.4-6.5.6s3 3.2 6.5.6Z" />
            <path d="M40 20.5c3.5-2.6 6.5-2.4 6.5.6s-3 3.2-6.5-.6Z" />
            <circle cx="39" cy="21" r="1.8" />
          </>
        ) : null}
        {accessory === 'sunhat' ? (
          <>
            <ellipse cx="32" cy="17" rx="20" ry="4.6" />
            <path d="M22.5 16.5c1.5-6 4.8-9.5 9.5-9.5s8 3.5 9.5 9.5c-6-2.2-13-2.2-19 0Z" />
          </>
        ) : null}
      </g>
    </svg>
  )
}
