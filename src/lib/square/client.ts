import 'server-only'
import { SquareClient, SquareEnvironment, type Square } from 'square'

/**
 * Square client, created lazily.
 *
 * Lazy construction matters: the app must build and the storefront must render
 * even when no Square credentials are configured. Only checkout itself needs
 * them.
 */
let client: SquareClient | null = null

/**
 * Reads an environment variable at run time.
 *
 * Next replaces a literal `process.env.NAME` in server code with whatever the
 * value was when the bundle was built, so a variable that did not exist at
 * build time stays absent no matter what the process is later started with.
 * A computed lookup is opaque to that substitution and so genuinely reads the
 * running environment — which is what the offline test needs in order to point
 * the app at its stub without rebuilding.
 */
function runtimeEnv(name: string): string | undefined {
  return process.env[name]
}

export function getSquare(): SquareClient {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'SQUARE_ACCESS_TOKEN is not set. Add it to .env to enable checkout.',
    )
  }
  if (!client) {
    client = new SquareClient({
      token,
      // SQUARE_BASE_URL exists for the offline test, which stands a stub of
      // Square's API in front of the app so the order pipeline can be proved
      // without credentials or a network. It is never set in production, where
      // the environment alone decides which Square is talked to.
      environment:
        runtimeEnv('SQUARE_BASE_URL') ||
        (isSquareSandbox() ? SquareEnvironment.Sandbox : SquareEnvironment.Production),
    })
  }
  return client
}

/**
 * Checkout needs a location as well as a token — every Square order belongs to
 * one — so a token on its own is not "configured".
 */
export function isSquareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID)
}

/**
 * Sandbox unless explicitly told otherwise.
 *
 * The default is deliberately the safe one. A missing or misspelled variable
 * therefore means test payments, never real ones charged against a live card.
 */
export function isSquareSandbox(): boolean {
  return (process.env.SQUARE_ENVIRONMENT ?? 'sandbox').toLowerCase() !== 'production'
}

export function squareLocationId(): string {
  const id = process.env.SQUARE_LOCATION_ID
  if (!id) {
    throw new Error('SQUARE_LOCATION_ID is not set. Add it to .env to enable checkout.')
  }
  return id
}

/**
 * Cents to a Square `Money`.
 *
 * Square takes amounts as BigInt in the currency's smallest unit, which is the
 * same integer this codebase stores everywhere — so this is a type conversion,
 * never a scaling one. Nothing here divides by 100.
 */
export function money(cents: number, currency: string): Square.Money {
  return {
    amount: BigInt(Math.round(cents)),
    currency: currency.toUpperCase() as Square.Currency,
  }
}

/** A Square `Money` back to cents. Absent or malformed amounts read as zero. */
export function centsOf(value: Square.Money | null | undefined): number {
  if (!value?.amount) return 0
  return Number(value.amount)
}
