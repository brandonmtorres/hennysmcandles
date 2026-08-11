'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogoLink } from '@/components/brand/Wordmark'
import { useCart } from '@/components/cart/CartProvider'

const NAV = [
  { href: '/products', label: 'Shop' },
  { href: '/ritual', label: 'The Ritual' },
  { href: '/about', label: 'Our Story' },
  { href: '/contact', label: 'Contact' },
]

export function Header({ announcement }: { announcement?: string }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { count, open, hydrated } = useCart()
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-wax focus:px-4 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.2em] focus:text-obsidian"
      >
        Skip to content
      </a>

      {announcement ? (
        <div className="relative z-40 border-b border-wax/8 bg-pitch/75 backdrop-blur-sm">
          <p className="mx-auto max-w-7xl truncate px-5 py-2.5 text-center text-[9px] font-light uppercase tracking-[0.18em] text-gild/85 sm:text-[10px] sm:tracking-[0.28em]">
            {announcement}
          </p>
        </div>
      ) : null}

      <header
        className={[
          'sticky top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          scrolled
            ? 'border-b border-wax/10 bg-obsidian/70 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8"
          style={{ height: scrolled ? 68 : 84, transition: 'height 700ms cubic-bezier(0.22,0.61,0.36,1)' }}
          aria-label="Primary"
        >
          <LogoLink />

          <ul className="hidden items-center gap-9 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className="label-sm group relative py-2 text-moon transition-colors duration-400 hover:text-wax"
                  >
                    {item.label}
                    <span
                      className={[
                        'absolute -bottom-0.5 left-0 h-px bg-gild transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                        active ? 'w-full' : 'w-0 group-hover:w-full',
                      ].join(' ')}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={open}
              className="label-sm group relative flex h-11 items-center gap-2.5 px-3 text-moon transition-colors duration-400 hover:text-wax"
              aria-label={`Open cart${hydrated && count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
            >
              <CartGlyph />
              <span className="hidden sm:inline">Cart</span>
              <span
                className={[
                  'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9.5px] tabular-nums tracking-normal transition-all duration-500',
                  hydrated && count > 0
                    ? 'bg-gild text-pitch opacity-100'
                    : 'scale-75 opacity-0',
                ].join(' ')}
                aria-hidden="true"
              >
                {count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center text-moon transition-colors hover:text-wax lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span className="relative block h-3 w-5">
                <span
                  className={[
                    'absolute left-0 block h-px w-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0',
                  ].join(' ')}
                />
                <span
                  className={[
                    'absolute left-0 top-1.5 block h-px w-full bg-current transition-all duration-300',
                    menuOpen ? 'opacity-0' : 'opacity-100',
                  ].join(' ')}
                />
                <span
                  className={[
                    'absolute left-0 block h-px w-full bg-current transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
                    menuOpen ? 'top-1.5 -rotate-45' : 'top-3',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={[
          'fixed inset-0 z-40 lg:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
        aria-hidden={!menuOpen}
      >
        <div
          className={[
            'absolute inset-0 bg-pitch/90 backdrop-blur-xl transition-opacity duration-500',
            menuOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          className={[
            'absolute inset-x-0 top-0 origin-top px-6 pb-12 pt-28 transition-all duration-600 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
            menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
          ].join(' ')}
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  tabIndex={menuOpen ? 0 : -1}
                  className="display-sm block border-b border-wax/10 py-5 text-wax transition-colors duration-400 hover:text-gild"
                  style={{
                    transitionDelay: menuOpen ? `${80 + i * 55}ms` : '0ms',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label-sm mt-10 text-smoke">
            Hand-poured in small batches
          </p>
        </nav>
      </div>
    </>
  )
}

function CartGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d="M4 6h12l-1 11H5L4 6Z" strokeLinejoin="round" />
      <path d="M7.4 6V4.6a2.6 2.6 0 0 1 5.2 0V6" strokeLinecap="round" />
    </svg>
  )
}
