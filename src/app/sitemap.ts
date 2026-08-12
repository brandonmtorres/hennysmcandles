import type { MetadataRoute } from 'next'
import { getAllProductSlugs } from '@/lib/products'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hennysmcandles.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/products', priority: 0.9 },
    { path: '/collections', priority: 0.7 },
    { path: '/about', priority: 0.7 },
    { path: '/ritual', priority: 0.7 },
    { path: '/contact', priority: 0.6 },
    { path: '/policies/shipping', priority: 0.4 },
    { path: '/policies/privacy', priority: 0.3 },
    { path: '/policies/terms', priority: 0.3 },
  ].map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    priority: route.priority,
  }))

  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const slugs = await getAllProductSlugs()
    productRoutes = slugs.map((slug) => ({
      url: `${siteUrl}/products/${slug}`,
      lastModified: now,
      priority: 0.8,
    }))
  } catch {
    // A database hiccup should not break the sitemap entirely.
  }

  return [...staticRoutes, ...productRoutes]
}
