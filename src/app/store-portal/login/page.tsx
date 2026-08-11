import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { LoginForm } from '@/app/store-portal/login/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
}

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const user = await getSessionUser()
  if (user) redirect('/store-portal')

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-obsidian px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="block text-3xl" aria-hidden="true">
            ☾
          </span>
          <p className="mt-6 font-[family-name:var(--font-display)] text-[21px] tracking-[0.2em] text-wax">
            HENNYS M.
          </p>
          <p className="mt-2 text-[8px] uppercase tracking-[0.4em] text-gild">
            Store portal
          </p>
        </div>

        <div className="mt-12">
          <LoginForm />
        </div>

        <p className="mt-10 text-center text-[11px] leading-relaxed text-smoke/70">
          This area is for the store owner. All sign-in attempts are logged.
        </p>
      </div>
    </main>
  )
}
