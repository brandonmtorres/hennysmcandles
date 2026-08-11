import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { Card } from '@/components/portal/ui'
import { PasswordForm } from '@/components/portal/PasswordForm'
import { TwoFactorPanel } from '@/components/portal/TwoFactorPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Security' }

export default async function SecurityPage() {
  const user = await requireUser()

  const [record, recentActivity] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true, lastLoginAt: true },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  return (
    <>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          Security
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          Your password, two-factor authentication, and a record of what has happened
          in this portal.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card
            title="Password"
            description="At least 12 characters with upper case, lower case, and a number. Changing it signs out every other device."
          >
            <PasswordForm />
          </Card>

          <TwoFactorPanel enabled={record?.totpEnabled ?? false} />
        </div>

        <Card
          title="Recent activity"
          description="Every sign-in and change made here, newest first."
          className="overflow-hidden"
        >
          {recentActivity.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">Nothing recorded yet.</p>
          ) : (
            <ul className="-m-6 divide-y divide-rule">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="px-6 py-3.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[13.5px] text-ink">
                      {describeAction(entry.action)}
                    </span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-ink-soft">
                      {entry.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      {entry.createdAt.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {entry.ip ? (
                    <p className="mt-1 font-mono text-[11px] text-ink-soft">{entry.ip}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

/** Audit actions are stored as machine keys; the owner reads plain English. */
function describeAction(action: string): string {
  const map: Record<string, string> = {
    'auth.login': 'Signed in',
    'auth.login_2fa': 'Signed in with two-factor',
    'auth.login_failed': 'Failed sign-in attempt',
    'product.create': 'Added a candle',
    'product.update': 'Edited a candle',
    'product.stock_update': 'Changed stock',
    'product.visibility': 'Changed where a candle shows',
    'product.delete': 'Deleted a candle',
    'product.archive': 'Hid a candle that has orders',
    'order.fulfil': 'Marked an order shipped',
    'order.refund': 'Refunded an order',
    'settings.update': 'Updated settings',
    'security.password_changed': 'Changed the password',
    'security.password_change_failed': 'Failed password change',
    'security.2fa_enabled': 'Turned on two-factor',
    'security.2fa_disabled': 'Turned off two-factor',
  }
  return map[action] ?? action
}
