import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ProductForm } from '@/components/portal/ProductForm'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    select: { name: true },
  })
  return { title: product?.name ?? 'Product' }
}

export default async function EditProductPage({ params }: Params) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!product) notFound()

  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/products" className="transition-colors hover:text-ink">
          Products
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
          {product.name}
        </h1>
        <Link
          href={`/products/${product.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-[12.5px] text-ink-soft transition-colors hover:text-ink"
        >
          View on shop ↗
        </Link>
      </div>

      <ProductForm
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          tagline: product.tagline,
          scent: product.scent,
          description: product.description,
          story: product.story,
          price: (product.priceCents / 100).toFixed(2),
          salePercent: product.salePercent,
          onSale: product.onSale,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          visibility: product.visibility,
          sizeOz: product.sizeOz,
          burnTimeHours: product.burnTimeHours,
          wick: product.wick,
          wax: product.wax,
          crystal: product.crystal ?? '',
          crystalMeaning: product.crystalMeaning ?? '',
          scentTop: product.scentTop ?? '',
          scentHeart: product.scentHeart ?? '',
          scentBase: product.scentBase ?? '',
          ingredients: product.ingredients,
          featured: product.featured,
          sortOrder: product.sortOrder,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />
    </>
  )
}
