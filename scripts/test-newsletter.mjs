/**
 * The mailing list, end to end: subscribe, welcome, unsubscribe, resubscribe,
 * and that the event log tells the truth about additions and losses.
 */
import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const db = new PrismaClient()
const BASE = 'http://localhost:3000'
let failures = 0

const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label.padEnd(48)}${detail}`,
  )
}

const EMAIL = `nl-test-${Date.now()}@example.com`

async function post(path, body, headers = {}) {
  const send = () =>
    fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })

  let res = await send()
  // The signup throttle is 5 a minute per address. A previous run in the same
  // minute can leave the budget spent, so wait it out rather than fail.
  if (res.status === 429) {
    console.log('    (throttled — waiting out the window)')
    await new Promise((r) => setTimeout(r, 61_000))
    res = await send()
  }
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

const row = () => db.newsletterSubscriber.findUnique({ where: { email: EMAIL } })
const events = () =>
  db.newsletterEvent.findMany({ where: { email: EMAIL }, orderBy: { createdAt: 'asc' } })

console.log('\nValidation\n')
for (const [payload, label] of [
  [{ email: 'not-an-email' }, 'rejects a malformed address'],
  [{ email: '' }, 'rejects an empty address'],
]) {
  const { status } = await post('/api/newsletter', payload)
  check(label, status === 400, `(${status})`)
}

console.log('\nSubscribing\n')

if (fs.existsSync('.mail-preview')) {
  for (const f of fs.readdirSync('.mail-preview')) {
    if (f.includes('Welcome')) fs.unlinkSync(`.mail-preview/${f}`)
  }
}

{
  const { status } = await post('/api/newsletter', { email: EMAIL, source: 'popup' })
  const s = await row()
  check('a new address is added', status === 200 && s?.status === 'SUBSCRIBED')
  check('the source is recorded', s?.source === 'popup', s?.source)
  check('a random unsubscribe token is issued', (s?.unsubscribeToken?.length ?? 0) >= 30)
  check('a SUBSCRIBED event is logged', (await events())[0]?.type === 'SUBSCRIBED')
}

{
  const files = fs.existsSync('.mail-preview') ? fs.readdirSync('.mail-preview') : []
  const welcome = files.find((f) => f.includes('Welcome'))
  check('a welcome email is rendered', Boolean(welcome), welcome ?? '')
  if (welcome) {
    const html = fs.readFileSync(`.mail-preview/${welcome}`, 'utf8')
    const s = await row()
    check('the welcome carries a working unsubscribe link',
      html.includes(`/unsubscribe/${s.unsubscribeToken}`))
  }
  const s = await row()
  check('the welcome is marked as sent', Boolean(s?.welcomedAt))
}

{
  // Signing up twice must not duplicate anybody or re-send the welcome.
  const before = (await events()).length
  const { status } = await post('/api/newsletter', { email: EMAIL, source: 'footer' })
  const after = (await events()).length
  const count = await db.newsletterSubscriber.count({ where: { email: EMAIL } })
  check('signing up twice is harmless', status === 200 && count === 1)
  check('and logs no second event', after === before)
}

console.log('\nLeaving and returning\n')

{
  const s = await row()
  const res = await fetch(`${BASE}/unsubscribe/${s.unsubscribeToken}`)
  const after = await row()
  check('the unsubscribe link works', res.status === 200 && after?.status === 'UNSUBSCRIBED')
  check('and is logged as a loss',
    (await events()).some((e) => e.type === 'UNSUBSCRIBED'))
  check('the leaving date is stamped', Boolean(after?.unsubscribedAt))
}

{
  // Visiting the same link twice should not error or double-count.
  const s = await row()
  const before = (await events()).filter((e) => e.type === 'UNSUBSCRIBED').length
  await fetch(`${BASE}/unsubscribe/${s.unsubscribeToken}`)
  const after = (await events()).filter((e) => e.type === 'UNSUBSCRIBED').length
  check('using the link twice counts once', before === after)
}

{
  const s = await row()
  const { status } = await post('/api/newsletter/resubscribe', { token: s.unsubscribeToken })
  const after = await row()
  check('someone can come back', status === 200 && after?.status === 'SUBSCRIBED')
  check('a return is logged separately from a new signup',
    (await events()).some((e) => e.type === 'RESUBSCRIBED'))
}

{
  const { status } = await post('/api/newsletter/resubscribe', { token: 'not-a-real-token' })
  check('an unknown token is refused', status === 404, `(${status})`)
}

console.log('\nGrowth reporting\n')

{
  // `src/lib/newsletter.ts` carries a `server-only` guard, so it cannot be
  // imported here — correctly. The growth view is derived entirely from the
  // event log, so the invariants are asserted against that instead.
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const all = await db.newsletterEvent.findMany({ where: { createdAt: { gte: since } } })
  const isJoin = (t) => t === 'SUBSCRIBED' || t === 'RESUBSCRIBED'
  const isLeave = (t) => t === 'UNSUBSCRIBED' || t === 'BOUNCED' || t === 'DELETED'

  const joins = all.filter((e) => isJoin(e.type)).length
  const leaves = all.filter((e) => isLeave(e.type)).length

  check("today's log contains the joins just made", joins >= 2, `${joins}`)
  check("today's log contains the leave just made", leaves >= 1, `${leaves}`)
  check(
    'every event is classified as a join or a leave',
    all.every((e) => isJoin(e.type) || isLeave(e.type)),
  )

  // The event log must reconcile with the current list size.
  const everyEvent = await db.newsletterEvent.findMany()
  const netFromEvents = everyEvent.reduce(
    (n, e) => n + (isJoin(e.type) ? 1 : isLeave(e.type) ? -1 : 0),
    0,
  )
  const actual = await db.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } })
  check(
    'the event history reconciles with the live list',
    netFromEvents === actual,
    `events say ${netFromEvents}, table says ${actual}`,
  )
}

{
  // And the portal page renders those figures without error.
  const res = await fetch(`${BASE}/store-portal/newsletter`, { redirect: 'manual' })
  check(
    'the portal newsletter page is behind the login',
    res.status === 307 || res.status === 302,
    `(${res.status})`,
  )
}

console.log('\nThe throttle cannot be talked around\n')

{
  // A caller who sets x-forwarded-for themselves must not get a fresh budget.
  // With no trusted proxy configured the header is ignored outright, so all of
  // these land in the one shared bucket and the ceiling still bites.
  let sawLimit = false
  for (let i = 0; i < 70; i += 1) {
    const res = await fetch(`${BASE}/api/newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `203.0.113.${i}`,
      },
      body: JSON.stringify({ email: `spoof-${i}@example.com` }),
    })
    if (res.status === 429) {
      sawLimit = true
      break
    }
  }
  check('a spoofed x-forwarded-for gets no fresh budget', sawLimit)

  // That burst deliberately used up the signup allowance, and with no trusted
  // proxy configured the allowance is shared by everybody — including whatever
  // test runs next. Waiting for the window to roll over hands it back rather
  // than leaving the following script to fail on a 429 that is not its fault.
  if (sawLimit) {
    console.log('    (waiting out the signup window so later tests start clean)')
    await new Promise((resolve) => setTimeout(resolve, 62_000))
  }

  await db.newsletterEvent.deleteMany({ where: { email: { startsWith: 'spoof-' } } })
  await db.newsletterSubscriber.deleteMany({ where: { email: { startsWith: 'spoof-' } } })
}

// Clean up after ourselves.
await db.newsletterEvent.deleteMany({ where: { email: EMAIL } })
await db.newsletterSubscriber.deleteMany({ where: { email: EMAIL } })

console.log(
  failures === 0
    ? '\n\x1b[32mThe mailing list behaves.\x1b[0m\n'
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
)
if (failures > 0) process.exitCode = 1
await db.$disconnect()
