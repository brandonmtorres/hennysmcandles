/**
 * Seasonal dressing for a collection's home-page banner.
 *
 * Each theme is a full scene rather than a colour swap: its own weather, a
 * large motif bleeding off the frame, a divider glyph, wording split so the
 * second phrase can carry the wordmark's script, and a small accessory for the
 * cat. The restraint lives in the palette — three colours and one accent — so
 * the seasons feel distinct without any of them fighting the night sky the
 * rest of the site is built on.
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
  | 'branch'
  | 'wreath'
  | 'wave'

/** What drifts through the band. */
export type Weather = 'leaves' | 'snow' | 'pollen' | 'petals' | 'blossom'

/** A small seasonal detail the cat wears. */
export type CatAccessory = 'hat' | 'leaf' | 'flower' | 'bow' | 'sunhat' | null

export type Theme = {
  key: ThemeKey
  label: string
  /** Shown in the portal so the owner knows when to reach for it. */
  season: string

  /** Ground: top, bottom, and a warm pool of light. */
  from: string
  to: string
  glow: string
  accent: string
  /** A second accent, used for the weather and the fine detail. */
  accentSoft: string

  weather: Weather
  /** The large motif that bleeds off the right edge. */
  hero: Motif
  /** Small marks scattered across the band. */
  motifs: Motif[]
  /** The glyph that sits in the rule above the products. */
  divider: Motif
  cat: CatAccessory

  /** Wording, split so the second phrase can be set in the script. */
  headingLead: string
  headingAccent: string
  body: string
  /** The label above the heading. */
  eyebrow: string
}

export const THEMES: Record<Exclude<ThemeKey, 'NONE'>, Theme> = {
  FALL: {
    key: 'FALL',
    label: 'Fall',
    season: 'September to November',
    from: '#1c0f09',
    to: '#5e2f14',
    glow: '#c9702a',
    accent: '#e09a4a',
    accentSoft: '#b8632c',
    weather: 'leaves',
    hero: 'branch',
    motifs: ['leaf', 'leaf', 'star', 'leaf'],
    divider: 'leaf',
    cat: 'leaf',
    eyebrow: 'The turning',
    headingLead: 'Everything smells like',
    headingAccent: 'woodsmoke',
    body: 'Spiced, resinous and warm. Poured for the weeks when the light starts going early and the evenings stretch out.',
  },
  CHRISTMAS: {
    key: 'CHRISTMAS',
    label: 'Christmas',
    season: 'late November to December',
    from: '#08170f',
    to: '#0f3d29',
    glow: '#d8b45e',
    accent: '#e3c374',
    accentSoft: '#8fbfa0',
    weather: 'snow',
    hero: 'fir',
    motifs: ['star', 'snow', 'fir', 'star'],
    divider: 'star',
    cat: 'hat',
    eyebrow: 'Midwinter',
    headingLead: 'The longest nights,',
    headingAccent: 'lit',
    body: 'Balsam, orange peel and warm clove. Poured in small batches for the darkest weeks of the year, and gone again by spring.',
  },
  SUMMER: {
    key: 'SUMMER',
    label: 'Summer',
    season: 'June to August',
    from: '#0a2630',
    to: '#1d6470',
    glow: '#f3c07a',
    accent: '#f5c98a',
    accentSoft: '#7fd0d6',
    weather: 'pollen',
    hero: 'sun',
    motifs: ['shell', 'wave', 'star', 'sun'],
    divider: 'sun',
    cat: 'sunhat',
    eyebrow: 'Long evenings',
    headingLead: 'The light that stays',
    headingAccent: 'late',
    body: 'Mango, coconut milk and sea salt. The ones that make a grey week feel a good deal further away than it is.',
  },
  VALENTINES: {
    key: 'VALENTINES',
    label: "Valentine's Day",
    season: 'late January to 14 February',
    from: '#210a15',
    to: '#63182f',
    glow: '#e0798f',
    accent: '#f0a3b4',
    accentSoft: '#d4738c',
    weather: 'petals',
    hero: 'heart',
    motifs: ['heart', 'blossom', 'heart', 'star'],
    divider: 'heart',
    cat: 'bow',
    eyebrow: 'For the fourteenth',
    headingLead: 'Something to light',
    headingAccent: 'together',
    body: 'Bulgarian rose, vanilla absolute and sandalwood, set with rose quartz and dried rosebuds placed by hand.',
  },
  MOTHERS_DAY: {
    key: 'MOTHERS_DAY',
    label: "Mother's Day",
    season: 'April to May',
    from: '#1b1229',
    to: '#4f3160',
    glow: '#cfa8dd',
    accent: '#dcbce8',
    accentSoft: '#b490c6',
    weather: 'blossom',
    hero: 'blossom',
    motifs: ['blossom', 'star', 'blossom', 'leaf'],
    divider: 'blossom',
    cat: 'flower',
    eyebrow: 'For her',
    headingLead: 'The one she would',
    headingAccent: 'actually keep',
    body: 'Lavender, peony and soft musk. Wrapped by hand, with a note in the box if you would like one.',
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
