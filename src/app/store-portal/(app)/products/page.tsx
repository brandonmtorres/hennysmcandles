import Link from 'next/link'
import { db } from '@/lib/db'
import { effectivePriceCents, formatMoney, isDiscounted } from '@/lib/money'
import { getSettings } from '@/lib/settings'
import { EmptyState, PortalButton } from '@/components/portal/ui'
import { ProductRow } from '@/components/portal/ProductRow'
import { SavedNotice } from '@/components/portal/SavedNotice'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Products' }

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const settings = await getSettings()

  const products = await db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  })

  return (
    <>
      {saved ? <SavedNotice message="Product saved." /> : null}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
            Products
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {products.length} candle{products.length === 1 ? '' : 's'}. Edit stock and
            visibility right here, or open one for the full details.
          </p>
        </div>
        <Link href="/store-portal/products/new">
          <PortalButton tone="primary">Add a candle</PortalButton>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border border-rule bg-surface">
          <EmptyState
            title="No candles yet"
            body="Add your first candle and it will appear on the shop straight away."
            action={
              <Link href="/store-portal/products/new">
                <PortalButton tone="primary">Add a candle</PortalButton>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="border border-rule bg-surface">
          {/* Column headings, desktop only — the cards carry their own labels below lg. */}
          <div className="hidden border-b border-rule px-5 py-3 lg:grid lg:grid-cols-[auto_1fr_7rem_9rem_10rem_5rem] lg:items-center lg:gap-4">
            {['', 'Candle', 'Price', 'In stock', 'Shown on shop', ''].map((heading, i) => (
              <span
                key={i}
                className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft"
              >
                {heading}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-rule">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  image: product.images[0]?.url ?? null,
                  priceLabel: formatMoney(effectivePriceCents(product), settings.currency),
                  wasPriceLabel: isDiscounted(product)
                    ? formatMoney(product.priceCents, settings.currency)
                    : null,
                  salePercent: product.salePercent,
                  stock: product.stock,
                  visibility: product.visibility as 'VISIBLE' | 'HIDDEN' | 'AUTO',
                  lowStockThreshold: settings.lowStockThreshold,
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
