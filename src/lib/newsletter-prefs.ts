/**
 * What this browser remembers about being asked to join the list.
 *
 * The footer form and the popup both read and write this, which is the point of
 * putting it here: someone who signs up in the footer must never be popped at
 * afterwards, and that only works if both components agree on where the answer
 * is kept.
 *
 * Every access is wrapped, because storage throws rather than returns null in
 * private browsing. Losing the preference is survivable — the invitation simply
 * appears again next visit — so failure is always treated as "not asked yet".
 */

const JOINED_KEY = 'hm_newsletter_joined'
const DISMISSED_KEY = 'hm_newsletter_dismissed_until'

/** How long a "no thanks" is honoured before the invitation may return. */
const DISMISS_DAYS = 14

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* nothing to do — the invitation reappears next visit */
  }
}

export function hasJoined(): boolean {
  return read(JOINED_KEY) === '1'
}

/** Called wherever a signup succeeds, footer and popup alike. */
export function markJoined(): void {
  write(JOINED_KEY, '1')
}

export function isDismissed(): boolean {
  return Date.now() < Number(read(DISMISSED_KEY) ?? 0)
}

export function markDismissed(): void {
  write(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000))
}

/** True when this browser should not be asked at all right now. */
export function shouldStayQuiet(): boolean {
  return hasJoined() || isDismissed()
}
