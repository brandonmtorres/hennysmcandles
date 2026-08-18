import { NextResponse, type NextRequest } from 'next/server'

/**
 * A shared password across the whole site, for while it is being shown to
 * people before it opens.
 *
 * Set SITE_PASSWORD and every page asks for it once, through the browser's own
 * sign-in box. Leave it unset and this does nothing at all, so local work and
 * the real launch are unaffected — the shop is meant to be public eventually.
 *
 * This is a curtain, not a lock. It keeps a work-in-progress from being read by
 * search engines and passers-by who happen on the address. The store portal
 * keeps its own real sign-in behind this, and that is what actually protects
 * the orders and customer details.
 *
 * One thing deliberately stays open: Square's webhook, because Square cannot
 * type a password. It is not left unguarded — every request to it is checked
 * against a signature, which is stronger than anything a shared word offers.
 */

const OPEN_PATHS = ['/api/webhooks/square']

/** Compares in constant time, so the response cannot be timed one letter at a time. */
function matches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false
  let difference = 0
  for (let i = 0; i < given.length; i += 1) {
    difference |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return difference === 0
}

export function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (OPEN_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const header = request.headers.get('authorization') ?? ''
  if (header.startsWith('Basic ')) {
    let decoded = ''
    try {
      decoded = atob(header.slice(6))
    } catch {
      decoded = ''
    }
    // The name is ignored; only the word after the first colon has to be right.
    const supplied = decoded.slice(decoded.indexOf(':') + 1)
    if (decoded.includes(':') && matches(supplied, password)) {
      return NextResponse.next()
    }
  }

  return new NextResponse('This site is not open yet.', {
    status: 401,
    headers: {
      // Plain ASCII only. A header value is a ByteString, so the em dash this
      // realm first carried threw on every rejection and turned the challenge
      // into a 500 — which never prompts for a password, leaving the site
      // unopenable rather than merely closed.
      'WWW-Authenticate': 'Basic realm="Hennys M. - not open yet", charset="UTF-8"',
      // A preview must never be indexed, whatever robots.txt happens to say.
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  })
}

export const config = {
  // Everything. Photographs of the candles are behind the curtain too, which
  // they would not be if the usual "skip anything ending .jpg" exclusion were
  // used here. Once the browser has the password it sends it with every request
  // to the site, so nothing needs excusing for the page to work.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
