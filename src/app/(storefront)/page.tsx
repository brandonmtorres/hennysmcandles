import { db } from '@/lib/db'
import { getFeaturedProducts, getStorefrontProducts } from '@/lib/products'
import { Hero } from '@/components/sections/Hero'
import { Collection } from '@/components/sections/Collection'
import { WhatsInside } from '@/components/sections/WhatsInside'
import { Ritual } from '@/components/sections/Ritual'
import { MeetHennys } from '@/components/sections/MeetHennys'
import { Reviews } from '@/components/sections/Reviews'

// Catalogue and stock change from the portal, so the page is rendered per
// request rather than cached at build time.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, all, reviews] = await Promise.all([
    getFeaturedProducts(6),
    getStorefrontProducts(),
    db.review.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  // Lead with whatever is flagged as featured, then top up from the rest of the
  // catalogue so the grid always fills complete rows rather than leaving an
  // orphan tile.
  const showcase = [...featured]
  for (const product of all) {
    if (showcase.length >= 6) break
    if (!showcase.some((p) => p.id === product.id)) showcase.push(product)
  }

  return (
    <>
      <Hero scentCount={all.length} />
      <Collection products={showcase} totalCount={all.length} />
      <WhatsInside />
      <Ritual />
      <MeetHennys />
      <Reviews
        reviews={reviews.map((r) => ({
          id: r.id,
          author: r.author,
          rating: r.rating,
          title: r.title,
          body: r.body,
        }))}
      />
    </>
  )
}
