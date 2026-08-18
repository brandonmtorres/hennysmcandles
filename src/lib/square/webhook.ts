import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

/**
 * Square webhook verification.
 *
 * Square signs the notification URL concatenated with the raw request body,
 * HMAC-SHA256 under the subscription's signature key, base64 encoded, in the
 * `x-square-hmacsha256-signature` header.
 *
 * The URL is part of the signed payload, which is the detail that catches
 * people out: it must match what is registered in Square's dashboard exactly —
 * scheme, host, path, no trailing slash difference — or every delivery fails
 * verification even though the key is right. Hence its own env var rather than
 * reconstructing it from the request, which a proxy can rewrite.
 *
 * The SDK ships a `WebhooksHelper.verifySignature`, but it compares digests
 * with `===`. The comparison here is constant-time, matching how the rest of
 * this codebase compares secrets.
 */

export function verifySquareSignature({
  body,
  signature,
  notificationUrl,
  signatureKey,
}: {
  body: string
  signature: string
  notificationUrl: string
  signatureKey: string
}): boolean {
  if (!signature || !signatureKey || !notificationUrl) return false

  const expected = createHmac('sha256', signatureKey)
    .update(notificationUrl + body)
    .digest()

  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64')
  } catch {
    return false
  }

  // timingSafeEqual throws on a length mismatch, which is itself a leak-free
  // answer — a wrong-length digest cannot be the right one.
  if (given.length !== expected.length) return false
  return timingSafeEqual(given, expected)
}

/**
 * The event envelope, in the snake_case Square actually sends.
 *
 * Only the envelope is parsed. The payload's own amounts are deliberately
 * ignored: the handler fetches the payment and order from Square's API and
 * builds the record from that, so a truncated or reordered notification
 * cannot produce a wrong order.
 */
export const squareEventSchema = z.object({
  event_id: z.string().min(1).max(128),
  type: z.string().min(1).max(80),
  merchant_id: z.string().max(128).optional(),
  created_at: z.string().max(64).optional(),
  data: z.object({
    type: z.string().max(40).optional(),
    /** The id of the payment or refund the event concerns. */
    id: z.string().min(1).max(128),
  }),
})

export type SquareEvent = z.infer<typeof squareEventSchema>
