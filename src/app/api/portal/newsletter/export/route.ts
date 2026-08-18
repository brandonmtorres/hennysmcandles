import { db } from '@/lib/db'
import { getSessionUser, recordAudit } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Escapes a value for CSV, including the leading-character injection guard. */
function csv(value: string | null | undefined): string {
  const raw = String(value ?? '')
  // A cell starting with = + - @ is executed as a formula by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

/** Downloads the mailing list as CSV, for import into a sending platform. */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return new Response('Not signed in.', { status: 401 })

  const url = new URL(request.url)
  const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'subscribed'

  const subscribers = await db.newsletterSubscriber.findMany({
    where: scope === 'all' ? undefined : { status: 'SUBSCRIBED' },
    orderBy: { subscribedAt: 'desc' },
  })

  const header = ['Email', 'Name', 'Status', 'Source', 'Tag', 'Subscribed', 'Unsubscribed']
  const rows = subscribers.map((s) =>
    [
      csv(s.email),
      csv(s.name),
      csv(s.status),
      csv(s.source),
      csv(s.tag),
      csv(s.subscribedAt.toISOString()),
      csv(s.unsubscribedAt?.toISOString() ?? ''),
    ].join(','),
  )

  await recordAudit({
    user,
    action: 'newsletter.export',
    meta: { scope, count: subscribers.length },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response([header.join(','), ...rows].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hennys-mailing-list-${scope}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
