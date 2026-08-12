import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { toCard } from '@/lib/products'
import { CollectionForm } from '@/components/portal/CollectionForm'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const collection = await db.collection.findUnique({
    where: { id },
    select: { name: true },
  })
  return { title: collection?.name ?? 'Collection' }
}

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(date: Date | null): string {
  if (!date) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default async function EditCollectionPage({ params }: Params) {
  const { id } = await params

  const [collection, products] = await Promise.all([
    db.collection.findUnique({
      where: { id },
      include: { products: { select: { productId: true }, orderBy: { sortOrder: 'asc' } } },
    }),
    db.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        collections: { include: { collection: true } },
      },
    }),
  ])

  if (!collection) notFound()

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/collections" className="transition-colors hover:text-ink">
          Collections
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{collection.name}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          {collection.name}
        </h1>
        <Link
          href={`/collections/${collection.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-[12.5px] text-ink-soft transition-colors hover:text-ink"
        >
          View on shop ↗
        </Link>
      </div>

      <CollectionForm
        values={{
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          tagline: collection.tagline,
          description: collection.description,
          visibility: collection.visibility,
          salePercent: collection.salePercent,
          saleActive: collection.saleActive,
          featured: collection.featured,
          sortOrder: collection.sortOrder,
          imageUrl: collection.imageUrl ?? '',
          startsAt: toLocalInput(collection.startsAt),
          endsAt: toLocalInput(collection.endsAt),
          productIds: collection.products.map((p) => p.productId),
          theme: collection.theme,
          bannerActive: collection.bannerActive,
          bannerHeading: collection.bannerHeading,
          bannerBody: collection.bannerBody,
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          image: p.images[0]?.url ?? null,
          priceLabel: formatMoney(p.priceCents),
        }))}
        previewProducts={products.map((p) => toCard(p))}
      />
    </>
  )
}
