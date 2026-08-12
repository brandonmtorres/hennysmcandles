/**
 * Seasonal dressing for a collection's home-page banner.
 *
 * Each theme is a small, disciplined set: two ground colours, an accent, a
 * handful of motifs, and default wording. They are deliberately restrained —
 * the site's own identity is the night sky, and a seasonal band is a guest in
 * it, not a takeover. Nothing here uses more than three colours or more than
 * about a dozen drawn marks.
 */

export type ThemeKey =
  | 'NONE'
  | 'FALL'
  | 'CHRISTMAS'
  | 'SUMMER'
  | 'VALENTINES'
  | 'MOTHERS_DAY'

export type Motif =
  | 'leaf'
  | 'fir'
  | 'snow'
  | 'sun'
  | 'shell'
  | 'heart'
  | 'blossom'
  | 'star'

export type Theme = {
  key: ThemeKey
  label: string
  /** Shown in the portal so the owner knows when to reach for it. */
  season: string
  /** Gradient ends for the band, dark enough to keep cream type readable. */
  from: string
  to: string
  accent: string
  /** Warm or cool cast for the drifting motes over the band. */
  mote: string
  motifs: Motif[]
  heading: string
  body: string
}

export const THEMES: Record<Exclude<ThemeKey, 'NONE'>, Theme> = {
  FALL: {
    key: 'FALL',
    label: 'Fall',
    season: 'September to November',
    from: '#2a1710',
    to: '#5c2f18',
    accent: '#d98b3f',
    mote: '#e0a35c',
    motifs: ['leaf', 'leaf', 'star'],
    heading: 'The turning of the year',
    body: 'Spiced, resinous and warm — poured for the weeks when the light starts going early.',
  },
  CHRISTMAS: {
    key: 'CHRISTMAS',
    label: 'Christmas',
    season: 'late November to December',
    from: '#0e1f19',
    to: '#123a2a',
    accent: '#d6b25e',
    mote: '#f0e3c2',
    motifs: ['fir', 'snow', 'star', 'fir'],
    heading: 'Midwinter, by candlelight',
    body: 'Balsam, orange peel and clove. Poured in small batches for the darkest weeks of the year.',
  },
  SUMMER: {
    key: 'SUMMER',
    label: 'Summer',
    season: 'June to August',
    from: '#12303a',
    to: '#1c5a63',
    accent: '#f0b878',
    mote: '#ffd9a0',
    motifs: ['sun', 'shell', 'star'],
    heading: 'Long evenings',
    body: 'Mango, coconut milk and sea salt — the ones that make a grey week feel further away.',
  },
  VALENTINES: {
    key: 'VALENTINES',
    label: "Valentine's Day",
    season: 'late January to 14 February',
    from: '#2a0f1c',
    to: '#5e1f35',
    accent: '#e8899f',
    mote: '#f2b6c4',
    motifs: ['heart', 'blossom', 'heart'],
    heading: 'Something to light together',
    body: 'Bulgarian rose, vanilla absolute and sandalwood, set with rose quartz.',
  },
  MOTHERS_DAY: {
    key: 'MOTHERS_DAY',
    label: "Mother's Day",
    season: 'April to May',
    from: '#231832',
    to: '#4a2f57',
    accent: '#c9a9d8',
    mote: '#e2cdec',
    motifs: ['blossom', 'blossom', 'star'],
    heading: 'For her',
    body: 'Lavender, peony and soft musk. Wrapped by hand, with a note if you would like one.',
  },
}

export const THEME_KEYS: ThemeKey[] = [
  'NONE',
  'FALL',
  'CHRISTMAS',
  'SUMMER',
  'VALENTINES',
  'MOTHERS_DAY',
]

export function getTheme(key: string): Theme | null {
  if (key === 'NONE') return null
  return THEMES[key as Exclude<ThemeKey, 'NONE'>] ?? null
}

export function themeLabel(key: string): string {
  return getTheme(key)?.label ?? 'No theme'
}
