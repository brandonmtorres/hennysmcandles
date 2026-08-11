'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireUser, recordAudit } from '@/lib/auth'
import { fieldErrors, productSchema, slugify } from '@/lib/validation'
import { parsePriceToCents } from '@/lib/money'

export type ProductFormState = {
  errors?: Record<string, string>
  message?: string
}

/** Pulls the product form into the shape the schema expects. */
function readForm(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const int = (key: string, fallback = 0) => {
    const value = Number.parseInt(text(key), 10)
    return Number.isFinite(value) ? value : fallback
  }

  const name = text('name')
  return {
    name,
    slug: text('slug') ? slugify(text('slug')) : slugify(name),
    tagline: text('tagline'),
    scent: text('scent'),
    description: text('description'),
    story: text('story'),

    priceCents: parsePriceToCents(text('price')) ?? -1,
    salePercent: int('salePercent'),
    onSale: formData.get('onSale') === 'on',

    stock: int('stock'),
    lowStockThreshold: int('lowStockThreshold', 3),
    visibility: text('visibility') || 'AUTO',

    sizeOz: Number.parseFloat(text('sizeOz')) || 0,
    burnTimeHours: int('burnTimeHours'),
    wick: text('wick'),
    wax: text('wax'),
    crystal: text('crystal'),
    crystalMeaning: text('crystalMeaning'),
    scentTop: text('scentTop'),
    scentHeart: text('scentHeart'),
    scentBase: text('scentBase'),
    ingredients: text('ingredients'),

    featured: formData.get('featured') === 'on',
    sortOrder: int('sortOrder'),
  }
}

/** Comma- or newline-separated image paths, paired with their alt text. */
function readImages(formData: FormData): { url: string; alt: string }[] {
  const raw = String(formData.get('images') ?? '')
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
    // Only same-origin paths — an external URL here would be an injection vector.
    .filter((url) => url.startsWith('/'))
    .slice(0, 8)
    .map((url, index) => ({
      url,
      alt: String(formData.get(`alt-${index}`) ?? '').trim() || 'Hennys M. candle',
    }))
}

export async function saveProduct(
  productId: string | null,
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser()

  const parsed = productSchema.safeParse(readForm(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) }
  }

  const data = parsed.data
  const images = readImages(formData)

  // Slugs are part of a public URL, so collisions must be caught explicitly.
  const clash = await db.product.findFirst({
    where: { slug: data.slug, ...(productId ? { NOT: { id: productId } } : {}) },
    select: { id: true },
  })
  if (clash) {
    return { errors: { slug: 'Another candle already uses this web address.' } }
  }

  let savedId = productId

  if (productId) {
    await db.product.update({ where: { id: productId }, data })
    await recordAudit({
      user,
      action: 'product.update',
      entity: 'product',
      entityId: productId,
      meta: { name: data.name, price: data.priceCents, stock: data.stock },
    })
  } else {
    const created = await db.product.create({ data })
    savedId = created.id
    await recordAudit({
      user,
      action: 'product.create',
      entity: 'product',
      entityId: created.id,
      meta: { name: data.name },
    })
  }

  if (savedId && images.length > 0) {
    await db.productImage.deleteMany({ where: { productId: savedId } })
    await db.productImage.createMany({
      data: images.map((image, index) => ({
        productId: savedId,
        url: image.url,
        alt: image.alt,
        sortOrder: index,
      })),
    })
  }

  revalidatePath('/store-portal/products')
  revalidatePath('/products')
  revalidatePath('/')
  if (savedId) revalidatePath(`/products/${data.slug}`)

  redirect('/store-portal/products?saved=1')
}

/** Inline stock edit from the products table. */
export async function updateStock(productId: string, stock: number): Promise<void> {
  const user = await requireUser()
  const safe = Math.max(0, Math.min(100_000, Math.round(stock)))

  await db.product.update({ where: { id: productId }, data: { stock: safe } })
  await recordAudit({
    user,
    action: 'product.stock_update',
    entity: 'product',
    entityId: productId,
    meta: { stock: safe },
  })

  revalidatePath('/store-portal/products')
  revalidatePath('/products')
  revalidatePath('/')
}

export async function setVisibility(
  productId: string,
  visibility: 'VISIBLE' | 'HIDDEN' | 'AUTO',
): Promise<void> {
  const user = await requireUser()
  if (!['VISIBLE', 'HIDDEN', 'AUTO'].includes(visibility)) return

  await db.product.update({ where: { id: productId }, data: { visibility } })
  await recordAudit({
    user,
    action: 'product.visibility',
    entity: 'product',
    entityId: productId,
    meta: { visibility },
  })

  revalidatePath('/store-portal/products')
  revalidatePath('/products')
  revalidatePath('/')
}

export async function deleteProduct(productId: string): Promise<void> {
  const user = await requireUser()

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true, slug: true, items: { select: { id: true }, take: 1 } },
  })
  if (!product) return

  if (product.items.length > 0) {
    // The product appears on a real order. Deleting it would damage that
    // record, so hide it instead — the owner's intent is served either way.
    await db.product.update({ where: { id: productId }, data: { visibility: 'HIDDEN' } })
    await recordAudit({
      user,
      action: 'product.archive',
      entity: 'product',
      entityId: productId,
      meta: { reason: 'has orders', name: product.name },
    })
  } else {
    await db.product.delete({ where: { id: productId } })
    await recordAudit({
      user,
      action: 'product.delete',
      entity: 'product',
      entityId: productId,
      meta: { name: product.name },
    })
  }

  revalidatePath('/store-portal/products')
  revalidatePath('/products')
  revalidatePath('/')
  redirect('/store-portal/products')
}
