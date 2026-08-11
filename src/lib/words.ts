const WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const

/**
 * Spells small numbers so editorial copy reads naturally — and, more
 * importantly, stays true when the catalogue changes. Hard-coding "seven
 * scents" would quietly become a lie the first time Hennys adds a candle.
 */
export function spell(count: number): string {
  return WORDS[count] ?? String(count)
}

export function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}
