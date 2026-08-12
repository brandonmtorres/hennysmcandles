/** Screenshots the seasonal banner in each theme, then restores the original. */
import { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'

const db = new PrismaClient()
const collection = await db.collection.findFirst({ where: { bannerActive: true } })
if (!collection) { console.error('No active banner collection.'); process.exit(1) }

const original = collection.theme
console.log(`Using "${collection.name}" (currently ${original})\n`)

for (const theme of ['FALL', 'CHRISTMAS', 'SUMMER', 'VALENTINES', 'MOTHERS_DAY']) {
  await db.collection.update({ where: { id: collection.id }, data: { theme } })
  execSync(`node scripts/shoot.mjs / theme-${theme.toLowerCase()} desktop false 760`, { stdio: 'pipe' })
  console.log(`  ${theme}`)
}

await db.collection.update({ where: { id: collection.id }, data: { theme: original } })
console.log(`\nRestored to ${original}`)
await db.$disconnect()
