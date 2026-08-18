import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * Payment happens on Square's own hosted page rather than inside this one, so
 * the policy stays tight: no third-party script, frame or connect origin is
 * needed for checkout. `form-action` is the exception — the browser follows a
 * redirect to Square when the customer leaves to pay.
 * `unsafe-inline` on styles is required by Next's inlined critical CSS.
 */
const isDev = process.env.NODE_ENV === 'development'

/**
 * Where product images are served from, when they are not served from here.
 *
 * Both the image optimiser and the Content Security Policy have to be told
 * about the bucket's public domain, and neither can be told at run time — so
 * it is read from the environment at build. A deployment that keeps its images
 * on local disk sets nothing and this stays empty.
 */
const imageHost = (() => {
  const raw = process.env.S3_PUBLIC_URL
  if (!raw) return null
  try {
    const { protocol, hostname } = new URL(raw)
    return { protocol: protocol.replace(':', '') as 'http' | 'https', hostname }
  } catch {
    throw new Error(`S3_PUBLIC_URL is not a valid URL: ${raw}`)
  }
})()

const csp = [
  "default-src 'self'",
  // React Fast Refresh evaluates strings in development only; production stays strict.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''}`.replace(/\s+/g, ' '),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.squarecdn.com${imageHost ? ` ${imageHost.protocol}://${imageHost.hostname}` : ''}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://squareup.com https://*.squareup.com",
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
    // Payment happens on Square's own domain, so this page needs no payment
    // permission of its own.
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
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
    // Only the configured bucket, never a wildcard: the optimiser will fetch
    // and re-serve anything listed here, so an open pattern turns it into a
    // proxy for the whole internet.
    remotePatterns: imageHost
      ? [{ protocol: imageHost.protocol, hostname: imageHost.hostname, pathname: '/**' }]
      : [],
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
