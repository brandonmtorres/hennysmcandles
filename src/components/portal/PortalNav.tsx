'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/app/store-portal/login/actions'

const LINKS = [
  { href: '/store-portal', label: 'Dashboard', exact: true },
  { href: '/store-portal/products', label: 'Products', badge: 'products' as const },
  { href: '/store-portal/collections', label: 'Collections' },
  { href: '/store-portal/orders', label: 'Orders', badge: 'orders' as const },
  { href: '/store-portal/settings', label: 'Settings' },
  { href: '/store-portal/security', label: 'Security' },
]

export function PortalNav({
  user,
  badges,
}: {
  user: { email: string; name: string | null }
  badges: { orders: number; products: number }
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[86rem] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/store-portal" className="flex flex-col leading-none">
            <span className="font-[family-name:var(--font-display)] text-[15px] tracking-[0.2em] text-ink">
              HENNYS M.
            </span>
            <span className="mt-1 text-[7.5px] uppercase tracking-[0.34em] text-gild-deep">
              Store portal
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Portal">
            {LINKS.map((link) => {
              const active = isActive(link.href, link.exact)
              const count = link.badge ? badges[link.badge] : 0
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'relative flex items-center gap-2 px-3.5 py-2 text-[12.5px] transition-colors',
                    active ? 'text-ink' : 'text-ink-soft hover:text-ink',
                  ].join(' ')}
                >
                  {link.label}
                  {count > 0 ? (
                    <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gild-deep px-1 text-[9.5px] tabular-nums text-white">
                      {count}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gild-deep" />
                  ) : null}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-[12px] text-ink-soft transition-colors hover:text-ink sm:block"
          >
            View store ↗
          </Link>

          <div className="hidden text-right sm:block">
            <p className="text-[12.5px] leading-tight text-ink">{user.name ?? 'Owner'}</p>
            <p className="text-[11px] leading-tight text-ink-soft">{user.email}</p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="h-9 rounded-[2px] border border-rule px-3.5 text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink/35 hover:text-ink"
            >
              Sign out
            </button>
          </form>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center border border-rule text-ink-soft lg:hidden"
          >
            <span className="text-[15px] leading-none">{open ? '×' : '≡'}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-rule bg-surface lg:hidden" aria-label="Portal mobile">
          <ul className="flex flex-col px-5 py-2 sm:px-8">
            {LINKS.map((link) => {
              const count = link.badge ? badges[link.badge] : 0
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={[
                      'flex items-center justify-between border-b border-rule py-3.5 text-[14px] last:border-b-0',
                      isActive(link.href, link.exact) ? 'text-ink' : 'text-ink-soft',
                    ].join(' ')}
                  >
                    {link.label}
                    {count > 0 ? (
                      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gild-deep px-1 text-[10px] text-white">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
