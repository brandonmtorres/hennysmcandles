/**
 * The colour of the sky through a sunrise.
 *
 * Interpolating a single background between "night" and "cream" produced a
 * muddy brown halfway through, which is why the arc read as a brightness
 * change rather than as the page's theme moving. A real dawn travels through
 * hue as well as value — indigo, violet, plum, ember, amber, gold — so the
 * ramp is defined as an actual palette and sampled.
 *
 * Two tracks: the upper sky and the horizon. The horizon runs warmer and
 * lights up earlier, which is what makes it read as a sunrise rather than a
 * dimmer switch.
 */

export type Rgb = [number, number, number]

type Stop = { at: number; zenith: Rgb; horizon: Rgb }

const SKY: Stop[] = [
  { at: 0.0, zenith: [7, 7, 15], horizon: [13, 11, 22] },
  { at: 0.2, zenith: [16, 11, 34], horizon: [36, 20, 54] },
  { at: 0.38, zenith: [29, 16, 48], horizon: [74, 31, 61] },
  { at: 0.55, zenith: [53, 32, 63], horizon: [138, 58, 52] },
  { at: 0.72, zenith: [107, 63, 58], horizon: [196, 113, 58] },
  { at: 0.87, zenith: [176, 138, 94], horizon: [227, 171, 99] },
  { at: 1.0, zenith: [222, 210, 184], horizon: [242, 234, 217] },
]

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

/** Samples the sky at a given dawn value, 0–1. */
export function skyAt(dawn: number): { zenith: Rgb; horizon: Rgb } {
  const d = Math.max(0, Math.min(1, dawn))

  let lower = SKY[0]!
  let upper = SKY[SKY.length - 1]!
  for (let i = 0; i < SKY.length - 1; i += 1) {
    if (d >= SKY[i]!.at && d <= SKY[i + 1]!.at) {
      lower = SKY[i]!
      upper = SKY[i + 1]!
      break
    }
  }

  const span = upper.at - lower.at
  const t = span === 0 ? 0 : (d - lower.at) / span

  return {
    zenith: mix(lower.zenith, upper.zenith, t),
    horizon: mix(lower.horizon, upper.horizon, t),
  }
}

export function rgb([r, g, b]: Rgb): string {
  return `rgb(${r},${g},${b})`
}
