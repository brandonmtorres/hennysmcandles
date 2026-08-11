import Link from 'next/link'
import { ProductForm } from '@/components/portal/ProductForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Add a candle' }

export default function NewProductPage() {
  return (
    <>
      <nav className="mb-6 text-[12.5px] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/store-portal/products" className="transition-colors hover:text-ink">
          Products
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">Add a candle</span>
      </nav>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        Add a candle
      </h1>

      <ProductForm
        values={{
          id: null,
          name: '',
          slug: '',
          tagline: '',
          scent: '',
          description: '',
          story: '',
          price: '',
          salePercent: 0,
          onSale: false,
          stock: 0,
          lowStockThreshold: 3,
          visibility: 'AUTO',
          sizeOz: 8,
          burnTimeHours: 45,
          wick: 'Cotton, lead-free',
          wax: '100% natural soy',
          crystal: '',
          crystalMeaning: '',
          scentTop: '',
          scentHeart: '',
          scentBase: '',
          ingredients:
            'Natural soy wax, phthalate-free fragrance oil, cotton wick, ethically sourced crystals, dried botanicals.',
          featured: false,
          sortOrder: 0,
          images: [],
        }}
      />
    </>
  )
}
