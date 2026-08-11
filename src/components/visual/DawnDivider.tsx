/**
 * The moon that carries the page between night and dawn.
 *
 * The sunrise fade is deliberately long — most of a viewport at each end of
 * the bright section — which would otherwise be a lot of empty ground. This
 * fills it with the brand's own symbol: a moon that waxes as `--dawn` rises
 * and wanes again as it falls, so the transition is the most deliberate
 * moment on the page rather than dead space.
 *
 * The terminator is a real one. A second circle masks the lit disc and slides
 * across it, which is how the moon's phases actually look — a straight edge
 * would read as a progress bar.
 */
export function DawnDivider({
  phase,
  label,
}: {
  phase: 'waxing' | 'waning'
  label: string
}) {
  const id = `moon-${phase}`

  return (
    <div
      className="pointer-events-none relative flex h-[23rem] flex-col items-center justify-center sm:h-[41.5rem]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        className="h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]"
        style={{
          // Fades in with the light rather than sitting flat on the night.
          opacity: 'calc(0.28 + var(--dawn) * 0.72)',
        }}
      >
        <defs>
          <radialGradient id={`${id}-lit`} cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#fdf8ec" />
            <stop offset="58%" stopColor="#efe3c8" />
            <stop offset="100%" stopColor="#c8a15a" />
          </radialGradient>

          <mask id={`${id}-mask`}>
            <rect x="0" y="0" width="120" height="120" fill="white" />
            {/*
              Slides from fully covering the disc to entirely clear of it.
              `--dawn` drives the translation, so the phase tracks the light.
            */}
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="black"
              style={{
                transform:
                  phase === 'waxing'
                    ? 'translateX(calc(var(--dawn) * -104px))'
                    : 'translateX(calc(var(--dawn) * 104px))',
                transition: 'transform 240ms linear',
              }}
            />
          </mask>
        </defs>

        {/* The unlit disc, always faintly present. */}
        <circle cx="60" cy="60" r="46" fill="#16151c" />
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="#c8a15a"
          strokeWidth="0.6"
          opacity="0.32"
        />

        {/* The lit portion. */}
        <circle
          cx="60"
          cy="60"
          r="46"
          fill={`url(#${id}-lit)`}
          mask={`url(#${id}-mask)`}
        />

        {/* Craters, only visible on the lit side because they share the mask. */}
        <g mask={`url(#${id}-mask)`} opacity="0.16">
          <circle cx="46" cy="44" r="8" fill="#8a7a5e" />
          <circle cx="74" cy="66" r="5.5" fill="#8a7a5e" />
          <circle cx="56" cy="80" r="3.5" fill="#8a7a5e" />
          <circle cx="80" cy="38" r="3" fill="#8a7a5e" />
        </g>
      </svg>

      {/* A hairline that brightens with the moon. */}
      <span
        className="mt-9 block h-px w-24 bg-gradient-to-r from-transparent via-gild to-transparent sm:w-32"
        style={{ opacity: 'calc(0.18 + var(--dawn) * 0.6)' }}
      />

      <span
        className="label-sm mt-5 text-center"
        style={{
          // Cream while the ground is dark, ink once the dawn has arrived.
          color:
            'color-mix(in oklab, #f2ead9 calc((1 - var(--dawn)) * 100%), #1c1c22)',
          opacity: 'calc(0.4 + var(--dawn) * 0.5)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
