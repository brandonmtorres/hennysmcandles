/**
 * Checks that this shop can actually send email, before a customer finds out
 * that it cannot.
 *
 * It reads the configuration, asks Resend whether the sending domain is
 * verified, and — with `--send you@example.com` — puts a real message in a
 * real inbox. Deliverability is the one part of this project that cannot be
 * proved from the code alone: a template can be perfect and still land in
 * spam because a DNS record is missing.
 *
 *   node scripts/check-email.mjs
 *   node scripts/check-email.mjs --send you@example.com
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

let problems = 0
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m) => {
  problems += 1
  console.log(`  \x1b[31m✗ ${m}\x1b[0m`)
}
const note = (m) => console.log(`  \x1b[33m·\x1b[0m ${m}`)

console.log('\nEmail preflight\n')

// --- Configuration ----------------------------------------------------------

const from = env.EMAIL_FROM ?? ''
const replyTo = env.EMAIL_REPLY_TO ?? ''
const owner = env.OWNER_NOTIFICATION_EMAIL ?? ''
const key = env.RESEND_API_KEY ?? ''

/** Pulls the bare address out of `Name <address>` or a plain address. */
function addressOf(value) {
  const angled = value.match(/<([^>]+)>/)
  return (angled ? angled[1] : value).trim().toLowerCase()
}

const fromAddress = addressOf(from)
const fromDomain = fromAddress.split('@')[1] ?? ''

if (!from) bad('EMAIL_FROM is not set — nothing can be sent.')
else if (!fromAddress.includes('@')) bad(`EMAIL_FROM is not a valid address: ${from}`)
else ok(`From: ${from}`)

if (!replyTo) note('EMAIL_REPLY_TO is not set; replies will go to the From address.')
else if (!replyTo.includes('@')) bad(`EMAIL_REPLY_TO is not a valid address: ${replyTo}`)
else ok(`Replies to: ${replyTo}`)

if (!owner) bad('OWNER_NOTIFICATION_EMAIL is not set — nobody is told about new orders.')
else ok(`New-order alerts to: ${owner}`)

if (replyTo && addressOf(replyTo).split('@')[1] !== fromDomain) {
  note(
    `Replies go to a different domain than the From address. That is allowed, but some\n` +
      `    filters treat it as a mild negative signal.`,
  )
}

// --- Resend -----------------------------------------------------------------

if (!key) {
  bad('RESEND_API_KEY is not set — no email is being delivered at all.')
  console.log(
    `\n  Nothing else can be checked without it. In production the app now logs\n` +
      `  every dropped message rather than writing a preview file.\n`,
  )
  process.exit(problems > 0 ? 1 : 0)
}

ok('RESEND_API_KEY is set')

async function resend(path, init) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body }
}

const domains = await resend('/domains')

if (domains.status === 401) {
  bad('Resend rejected the API key.')
} else if (domains.status >= 400) {
  bad(`Resend returned ${domains.status}: ${JSON.stringify(domains.body).slice(0, 200)}`)
} else {
  const list = domains.body?.data ?? []
  const match = list.find((d) => d.name?.toLowerCase() === fromDomain)

  if (!match) {
    bad(
      `${fromDomain} is not on this Resend account. Mail from that address will be\n` +
        `    rejected. Add and verify the domain, or send from a domain that is listed.`,
    )
    if (list.length > 0) {
      note(`Domains on the account: ${list.map((d) => `${d.name} (${d.status})`).join(', ')}`)
    }
  } else if (match.status !== 'verified') {
    bad(`${fromDomain} is on the account but its status is "${match.status}", not verified.`)
    note('Until it verifies, sends from this address will fail.')
  } else {
    ok(`${fromDomain} is verified with Resend`)

    // SPF and DKIM are what stop this landing in spam. Resend reports each
    // record it expects, so the gaps can be named rather than guessed at.
    const records = match.records ?? []
    const unverified = records.filter((r) => r.status && r.status !== 'verified')
    if (unverified.length === 0) {
      ok(`all ${records.length} DNS records verified (SPF, DKIM)`)
    } else {
      for (const record of unverified) {
        bad(`DNS record not verified: ${record.record ?? record.type} ${record.name ?? ''}`)
      }
    }

    const hasDmarc = records.some((r) => String(r.name ?? '').startsWith('_dmarc'))
    if (!hasDmarc) {
      note(
        'No DMARC record is managed here. It is not required, but a shop that emails\n' +
          '    receipts benefits from one — start with p=none and watch the reports.',
      )
    }
  }
}

// --- Optional live send -----------------------------------------------------

const sendFlag = process.argv.indexOf('--send')
if (sendFlag !== -1) {
  const to = process.argv[sendFlag + 1]
  if (!to || !to.includes('@')) {
    bad('--send needs an address: node scripts/check-email.mjs --send you@example.com')
  } else {
    const result = await resend('/emails', {
      method: 'POST',
      body: JSON.stringify({
        from,
        to,
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: 'Hennys M. — email preflight',
        html:
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1c22">' +
          '<p>If you are reading this, the shop can send email.</p>' +
          '<p>Check that it arrived in the inbox rather than spam, and that replying to it ' +
          'reaches the right mailbox.</p></div>',
      }),
    })

    if (result.status >= 400) {
      bad(`Test send failed (${result.status}): ${JSON.stringify(result.body).slice(0, 300)}`)
    } else {
      ok(`Test message sent to ${to} — check the inbox, and reply to it.`)
    }
  }
}

console.log(
  problems === 0
    ? '\n\x1b[32mEmail is configured and the domain is verified.\x1b[0m\n'
    : `\n\x1b[31m${problems} problem(s) to fix before customers rely on this.\x1b[0m\n`,
)
process.exit(problems > 0 ? 1 : 0)
