import Link from 'next/link'
import { MoonMark } from '@/components/brand/Wordmark'
import { NewsletterForm } from '@/components/layout/NewsletterForm'

const SHOP = [
  { href: '/products', label: 'All candles' },
  { href: '/collections', label: 'Collections' },
]

const STUDIO = [
  { href: '/about', label: 'Our story' },
  { href: '/ritual', label: 'The ritual' },
  { href: '/contact', label: 'Contact' },
]

const LEGAL = [
  { href: '/policies/shipping', label: 'Shipping & returns' },
  { href: '/policies/privacy', label: 'Privacy' },
  { href: '/policies/terms', label: 'Terms' },
]

export function Footer({
  discountPercent,
  candles,
}: {
  discountPercent: number
  /** Named candles to link, taken from the live catalogue rather than typed
   *  here — a hidden or renamed one must not stay linked from every page. */
  candles: { slug: string; name: string }[]
}) {
  const shopLinks = [
    ...SHOP,
    ...candles.map((c) => ({ href: `/products/${c.slug}`, label: c.name })),
  ]
  return (
    <footer className="veil-deep relative overflow-hidden border-t border-wax/10">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-20 sm:px-8 sm:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            {/* The mark is already a complete lockup — it carries the name and
                the descriptor — so no typographic wordmark sits beneath it. */}
            <MoonMark size={124} className="-ml-2 opacity-95" />
            <p className="mt-6 max-w-[34ch] text-[13.5px] leading-relaxed text-smoke">
              Hand-poured soy candles set with raw crystals and dried botanicals.
              Made in small batches, one pour at a time.
            </p>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Studio" links={STUDIO} />

          <div>
            <h3 className="label mb-5 text-wax">The quiet list</h3>
            <p className="mb-5 max-w-[32ch] text-[13.5px] leading-relaxed text-smoke">
              New pours, seasonal batches, and the occasional note from the studio.
              No noise.
            </p>
            <NewsletterForm discountPercent={discountPercent} />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-5 border-t border-wax/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="label-sm text-smoke transition-colors hover:text-wax"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com/hennysm.candles"
              target="_blank"
              rel="noreferrer noopener"
              className="label-sm flex items-center gap-2 text-smoke transition-colors hover:text-gild"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
              </svg>
              @hennysm.candles
            </a>
          </div>
        </div>

        <p className="mt-8 text-[11px] tracking-[0.12em] text-smoke/55">
          © {new Date().getFullYear()} Hennys M. Homemade Candles. Bring light to your life.
        </p>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
}) {
  return (
    <div>
      <h3 className="label mb-5 text-wax">{title}</h3>
      <ul className="flex flex-col gap-3">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-[13.5px] text-smoke transition-colors duration-400 hover:text-gild"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
