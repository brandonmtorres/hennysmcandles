import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, Jost } from 'next/font/google'
import './globals.css'

/**
 * The type pairing is taken from Hennys' own candle labels: a high-contrast
 * Didone for the scent name, a wide-tracked geometric sans for the small caps
 * beneath it.
 */
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bodoni',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const jost = Jost({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jost',
  weight: ['300', '400', '500'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hennysmcandles.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Hennys M. Homemade Candles — Bring Light to Your Life',
    template: '%s · Hennys M. Homemade Candles',
  },
  description:
    'Hand-poured soy candles set with raw crystals and dried botanicals. Made in small batches, one pour at a time.',
  keywords: [
    'soy candles',
    'crystal candles',
    'hand-poured candles',
    'handmade candles',
    'natural candles',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Hennys M. Homemade Candles',
    title: 'Hennys M. Homemade Candles — Bring Light to Your Life',
    description:
      'Hand-poured soy candles set with raw crystals and dried botanicals. Made in small batches.',
    images: [{ url: '/images/products/black-sea-mist-lit.jpeg', width: 1024, height: 768 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hennys M. Homemade Candles',
    description: 'Hand-poured soy candles set with raw crystals.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      `suppressHydrationWarning` is required because the script below adds an
      attribute to <html> before React hydrates — the same pattern theme
      switchers use. It suppresses the warning on this element only.
    */
    <html
      lang="en"
      className={`${bodoni.variable} ${jost.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Enables the scroll-reveal styles before first paint. Without this
          flag the reveal rules never apply, so a visitor with JavaScript
          blocked or still loading sees the full page rather than an empty one.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-choreo','on')`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
