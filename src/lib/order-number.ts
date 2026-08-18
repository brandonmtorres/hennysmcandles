import type { Prisma } from '@prisma/client'

/**
 * Sequential, human-readable order numbers: HM-1001, HM-1002, …
 *
 * These used to come from counting the orders table and adding 1001, which had
 * two faults. Two webhooks arriving together read the same count and produced
 * the same number, and deleting an order caused the next one to reuse a number
 * that had already been printed on a customer's receipt.
 *
 * A counter row incremented in the database has neither problem: the increment
 * is applied by the database, so simultaneous callers serialise, and the value
 * only ever goes up. It is called inside the order transaction, so a number is
 * consumed only by an order that actually saves.
 */
const COUNTER_NAME = 'order'
const FIRST_NUMBER = 1001

export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  prefix: string,
): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { name: COUNTER_NAME },
    create: { name: COUNTER_NAME, value: FIRST_NUMBER },
    update: { value: { increment: 1 } },
  })
  return `${prefix}-${counter.value}`
}
