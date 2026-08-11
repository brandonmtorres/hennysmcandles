import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * Stripe needs script + frame access for Checkout and the payment element.
 * `unsafe-inline` on styles is required by Next's inlined critical CSS.
 */
const isDev = process.env.NODE_ENV === 'development'

const csp = [
  "default-src 'self'",
  // React Fast Refresh evaluates strings in development only; production stays strict.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://js.stripe.com`.replace(
    /\s+/g,
    ' ',
  ),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.stripe.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    // payment=* is required so Apple Pay / Google Pay can run inside the Stripe frame.
    value: 'camera=(), microphone=(), geolocation=(), payment=*',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    // Every `quality` value used anywhere must be listed here — Next rejects
    // an unlisted one with a 400 and the image simply does not render.
    qualities: [72, 82, 84, 86, 88, 90],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The portal must never be indexed, cached, or archived.
      {
        source: '/store-portal/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
