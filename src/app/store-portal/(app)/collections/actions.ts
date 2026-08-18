'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recordAudit, requireUser } from '@/lib/auth'
import { fieldErrors, slugSchema, slugify } from '@/lib/validation'
import { isAllowedImageUrl } from '@/lib/storage'

export type CollectionFormState = {
  errors?: Record<string, string>
  message?: string
}

const collectionSchema = z.object({
  name: z.string().trim().min(2, 'Give the collection a name.').max(120),
  slug: slugSchema,
  tagline: z.string().trim().max(180).default(''),
  description: z.string().trim().max(2000).default(''),
  visibility: z.enum(['VISIBLE', 'HIDDEN', 'SCHEDULED']),
  salePercent: z.number().int().min(0).max(90),
  saleActive: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  imageUrl: z.string().trim().max(300).default(''),
  theme: z.enum(['NONE', 'FALL', 'CHRISTMAS', 'SUMMER', 'VALENTINES', 'MOTHERS_DAY']),
  bannerActive: z.boolean(),
  bannerHeading: z.string().trim().max(120).default(''),
  bannerBody: z.string().trim().max(300).default(''),
})

/** Datetime-local values arrive as "2026-08-12T09:00" or empty. */
function readDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function saveCollection(
  collectionId: string | null,
  _previous: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const user = await requireUser()

  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const name = text('name')

  const parsed = collectionSchema.safeParse({
    name,
    slug: text('slug') ? slugify(text('slug')) : slugify(name),
    tagline: text('tagline'),
    description: text('description'),
    visibility: text('visibility') || 'VISIBLE',
    salePercent: Number.parseInt(text('salePercent'), 10) || 0,
    saleActive: formData.get('saleActive') === 'on',
    featured: formData.get('featured') === 'on',
    sortOrder: Number.parseInt(text('sortOrder'), 10) || 0,
    imageUrl: text('imageUrl'),
    theme: text('theme') || 'NONE',
    // A banner without a theme has nothing to draw, so the two travel together.
    bannerActive: formData.get('bannerActive') === 'on' && text('theme') !== 'NONE',
    bannerHeading: text('bannerHeading'),
    bannerBody: text('bannerBody'),
  })

  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  const startsAt = readDate(formData.get('startsAt'))
  const endsAt = readDate(formData.get('endsAt'))

  if (startsAt && endsAt && endsAt <= startsAt) {
    return { errors: { endsAt: 'The end must come after the start.' } }
  }

  const clash = await db.collection.findFirst({
    where: {
      slug: parsed.data.slug,
      ...(collectionId ? { NOT: { id: collectionId } } : {}),
    },
    select: { id: true },
  })
  if (clash) {
    return { errors: { slug: 'Another collection already uses this web address.' } }
  }

  const { imageUrl, ...rest } = parsed.data
  const data = {
    ...rest,
    // Same rule as product images.
    imageUrl: imageUrl && isAllowedImageUrl(imageUrl) ? imageUrl : null,
    startsAt,
    endsAt,
  }

  const productIds = String(formData.get('productIds') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200)

  let savedId = collectionId

  if (collectionId) {
    await db.collection.update({ where: { id: collectionId }, data })
    await recordAudit({
      user,
      action: 'collection.update',
      entity: 'collection',
      entityId: collectionId,
      meta: { name: data.name, salePercent: data.salePercent },
    })
  } else {
    const created = await db.collection.create({ data })
    savedId = created.id
    await recordAudit({
      user,
      action: 'collection.create',
      entity: 'collection',
      entityId: created.id,
      meta: { name: data.name },
    })
  }

  // Only one banner dresses the home page at a time — turning this one on
  // stands the others down rather than leaving the choice ambiguous.
  if (savedId && data.bannerActive) {
    await db.collection.updateMany({
      where: { NOT: { id: savedId }, bannerActive: true },
      data: { bannerActive: false },
    })
  }

  if (savedId) {
    const valid = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    })
    await db.productCollection.deleteMany({ where: { collectionId: savedId } })
    if (valid.length > 0) {
      await db.productCollection.createMany({
        data: valid.map((product, index) => ({
          collectionId: savedId,
          productId: product.id,
          sortOrder: index,
        })),
      })
    }
  }

  revalidatePath('/store-portal/collections')
  revalidatePath('/collections', 'layout')
  revalidatePath('/products', 'layout')
  revalidatePath('/')

  redirect('/store-portal/collections?saved=1')
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const user = await requireUser()

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { name: true },
  })
  if (!collection) return

  // Deleting a collection never touches its products — the join rows cascade
  // and the candles stay exactly as they were.
  await db.collection.delete({ where: { id: collectionId } })
  await recordAudit({
    user,
    action: 'collection.delete',
    entity: 'collection',
    entityId: collectionId,
    meta: { name: collection.name },
  })

  revalidatePath('/store-portal/collections')
  revalidatePath('/collections', 'layout')
  revalidatePath('/')
  redirect('/store-portal/collections')
}

/** Quick toggle from the list, for starting and stopping a promotion. */
export async function toggleCollectionSale(
  collectionId: string,
  active: boolean,
): Promise<void> {
  const user = await requireUser()

  await db.collection.update({
    where: { id: collectionId },
    data: { saleActive: active },
  })
  await recordAudit({
    user,
    action: active ? 'collection.sale_start' : 'collection.sale_stop',
    entity: 'collection',
    entityId: collectionId,
  })

  revalidatePath('/store-portal/collections')
  revalidatePath('/collections', 'layout')
  revalidatePath('/products', 'layout')
  revalidatePath('/')
}
