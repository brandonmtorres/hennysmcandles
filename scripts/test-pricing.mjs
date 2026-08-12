/**
 * The discount rules, exercised directly.
 *
 * A candle can be on sale in its own right and also sit inside a collection
 * running a promotion. These assert the resolution is what the portal claims:
 * the larger single discount wins, and they never stack.
 */
// Run with:  npx tsx scripts/test-pricing.mjs
const { effectivePriceCents, resolveDiscountPercent, isPromoLive } = await import(
  '../src/lib/money.ts'
)

let failures = 0
const check = (label, actual, expected) => {
  const ok = actual === expected
  if (!ok) failures += 1
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label.padEnd(52)} ${actual}${ok ? '' : `  (expected ${expected})`}`,
  )
}

const candle = (over = {}) => ({
  priceCents: 3400,
  onSale: false,
  salePercent: 0,
  ...over,
})

const promo = (over = {}) => ({
  salePercent: 20,
  saleActive: true,
  visibility: 'VISIBLE',
  startsAt: null,
  endsAt: null,
  ...over,
})

const NOW = new Date('2026-08-12T12:00:00Z')

console.log('\nDiscount resolution\n')

check('no sale at all', effectivePriceCents(candle()), 3400)

check(
  'product sale only, 25%',
  effectivePriceCents(candle({ onSale: true, salePercent: 25 })),
  2550,
)

check(
  'collection promo only, 20%',
  effectivePriceCents(candle(), [promo()], NOW),
  2720,
)

check(
  'both — deeper product sale wins (30% beats 20%)',
  effectivePriceCents(candle({ onSale: true, salePercent: 30 }), [promo()], NOW),
  2380,
)

check(
  'both — deeper collection promo wins (40% beats 10%)',
  effectivePriceCents(
    candle({ onSale: true, salePercent: 10 }),
    [promo({ salePercent: 40 })],
    NOW,
  ),
  2040,
)

check(
  'discounts never stack (30% and 40% is not 58%)',
  resolveDiscountPercent(
    candle({ onSale: true, salePercent: 30 }),
    [promo({ salePercent: 40 })],
    NOW,
  ),
  40,
)

check(
  'several collections — the deepest live one wins',
  resolveDiscountPercent(
    candle(),
    [promo({ salePercent: 15 }), promo({ salePercent: 35 }), promo({ salePercent: 5 })],
    NOW,
  ),
  35,
)

console.log('\nWhen a promotion counts as live\n')

check('paused promotion is ignored', effectivePriceCents(candle(), [promo({ saleActive: false })], NOW), 3400)
check('hidden collection is ignored', effectivePriceCents(candle(), [promo({ visibility: 'HIDDEN' })], NOW), 3400)
check('zero percent is ignored', effectivePriceCents(candle(), [promo({ salePercent: 0 })], NOW), 3400)

check(
  'scheduled but not started yet',
  effectivePriceCents(candle(), [promo({ startsAt: new Date('2026-09-01') })], NOW),
  3400,
)
check(
  'scheduled and already ended',
  effectivePriceCents(candle(), [promo({ endsAt: new Date('2026-08-01') })], NOW),
  3400,
)
check(
  'scheduled and currently running',
  effectivePriceCents(
    candle(),
    [promo({ startsAt: new Date('2026-08-01'), endsAt: new Date('2026-09-01') })],
    NOW,
  ),
  2720,
)

console.log('\nBounds\n')

check(
  'a percentage above 90 is clamped',
  resolveDiscountPercent(candle({ onSale: true, salePercent: 999 })),
  90,
)
check(
  'a negative percentage is clamped to zero',
  resolveDiscountPercent(candle({ onSale: true, salePercent: -50 })),
  0,
)
check(
  'price never goes below zero',
  effectivePriceCents(candle({ priceCents: 100, onSale: true, salePercent: 90 })),
  10,
)
check('isPromoLive agrees with the resolver', isPromoLive(promo(), NOW), true)

console.log(
  failures === 0
    ? '\n\x1b[32mAll pricing rules hold.\x1b[0m\n'
    : `\n\x1b[31m${failures} pricing rule(s) wrong.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1
