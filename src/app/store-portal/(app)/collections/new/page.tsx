import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { CollectionForm } from '@/components/portal/CollectionForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New collection' }

export default async function NewCollectionPage() {
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  })

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/collections" className="transition-colors hover:text-ink">
          Collections
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">New collection</span>
      </nav>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        New collection
      </h1>

      <CollectionForm
        values={{
          id: null,
          name: '',
          slug: '',
          tagline: '',
          description: '',
          visibility: 'VISIBLE',
          salePercent: 0,
          saleActive: false,
          featured: false,
          sortOrder: 0,
          imageUrl: '',
          startsAt: '',
          endsAt: '',
          productIds: [],
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          image: p.images[0]?.url ?? null,
          priceLabel: formatMoney(p.priceCents),
        }))}
      />
    </>
  )
}
