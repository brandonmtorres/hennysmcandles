/**
 * Verifies that repeated failed sign-ins are throttled.
 *
 * The per-email bucket allows 5 failures in 15 minutes, so the 6th attempt
 * should be refused outright. Attempts are cleared afterwards so the owner
 * account is not left locked out.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const EXECUTABLE = fs
  .readdirSync('/root/.cache/ms-playwright')
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .reverse()
  .map((d) => `/root/.cache/ms-playwright/${d}/chrome-linux64/chrome`)
  .find((p) => fs.existsSync(p))

const db = new PrismaClient()
await db.loginAttempt.deleteMany({})

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
const email = 'ratelimit-probe@example.com'

let blockedAt = null

for (let attempt = 1; attempt <= 8; attempt += 1) {
  await page.goto('http://localhost:3000/store-portal/login', {
    waitUntil: 'networkidle',
  })
  await page.fill('#email', email)
  await page.fill('#password', 'wrong-password-attempt')
  await page.click('button[type=submit]')

  // Scope to the form: the Next.js dev overlay also carries role="alert".
  await page.waitForSelector('form [role=alert]', { timeout: 25000 })
  const message = (await page.locator('form [role=alert]').first().innerText()).trim()
  const blocked = /too many/i.test(message)
  if (blocked && !blockedAt) blockedAt = attempt

  console.log(
    `  attempt ${attempt}: ${blocked ? '\x1b[33mTHROTTLED\x1b[0m' : 'rejected '} — "${message.slice(0, 58)}"`,
  )
}

const recorded = await db.loginAttempt.count()

console.log(
  blockedAt && blockedAt <= 7
    ? `\n  \x1b[32m✓ throttling engaged at attempt ${blockedAt}\x1b[0m`
    : '\n  \x1b[31m✗ never throttled — credential stuffing is possible\x1b[0m',
)
console.log(`  ${recorded} attempts recorded in the database`)
if (!blockedAt) process.exitCode = 1

await browser.close()
await db.loginAttempt.deleteMany({})
console.log('  cleared attempts so the owner account is not locked out\n')
await db.$disconnect()
