import { NightSky } from '@/components/visual/NightSky'

/**
 * The ground the whole storefront sits on.
 *
 * A single fixed surface that warms and cools with `--dawn`, with the
 * starfield drawn over it. Sections above are largely transparent so this
 * reads as one continuous night rather than a stack of coloured blocks.
 */
export function Backdrop() {
  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <NightSky />
    </>
  )
}
