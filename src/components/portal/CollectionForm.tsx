'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  saveCollection,
  deleteCollection,
  type CollectionFormState,
} from '@/app/store-portal/(app)/collections/actions'
import { Card, Field, Input, PortalButton, Select, Textarea } from '@/components/portal/ui'
import { slugify } from '@/lib/validation'

export type CollectionFormValues = {
  id: string | null
  name: string
  slug: string
  tagline: string
  description: string
  visibility: string
  salePercent: number
  saleActive: boolean
  featured: boolean
  sortOrder: number
  imageUrl: string
  startsAt: string
  endsAt: string
  productIds: string[]
}

export type ProductOption = {
  id: string
  name: string
  image: string | null
  priceLabel: string
}

export function CollectionForm({
  values,
  products,
}: {
  values: CollectionFormValues
  products: ProductOption[]
}) {
  const action = saveCollection.bind(null, values.id)
  const [state, formAction] = useActionState<CollectionFormState, FormData>(action, {})

  const [name, setName] = useState(values.name)
  const [slug, setSlug] = useState(values.slug)
  const [slugEdited, setSlugEdited] = useState(values.slug.length > 0)
  const [visibility, setVisibility] = useState(values.visibility)
  const [saleActive, setSaleActive] = useState(values.saleActive)
  const [salePercent, setSalePercent] = useState(values.salePercent)
  const [productIds, setProductIds] = useState<string[]>(values.productIds)
  const [search, setSearch] = useState('')

  const error = (key: string) => state.errors?.[key]

  const matching = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card title="The collection" description="How it appears on the shop.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={error('name')}>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slugEdited) setSlug(slugify(e.target.value))
              }}
              required
              maxLength={120}
              placeholder="Midwinter Edit"
            />
          </Field>

          <Field
            label="Web address"
            htmlFor="slug"
            error={error('slug')}
            hint={
              slugEdited
                ? `Customers will find it at /collections/${slug || '…'}`
                : 'Filling in from the name. Type here to set it yourself.'
            }
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[13px] text-ink-soft">/collections/</span>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugEdited(true)
                }}
                maxLength={80}
                placeholder="midwinter-edit"
              />
            </div>
          </Field>

          <Field
            label="Tagline"
            htmlFor="tagline"
            hint="One line, shown under the name."
            className="sm:col-span-2"
          >
            <Input
              id="tagline"
              name="tagline"
              defaultValue={values.tagline}
              maxLength={180}
              placeholder="Five candles for the darkest weeks of the year."
            />
          </Field>

          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              rows={3}
              maxLength={2000}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="When it shows"
        description="Scheduled collections appear and disappear on their own — useful for a seasonal edit you set up in advance."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Show on shop" htmlFor="visibility">
            <Select
              id="visibility"
              name="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="VISIBLE">Always</option>
              <option value="SCHEDULED">Between the dates below</option>
              <option value="HIDDEN">Never — hidden</option>
            </Select>
          </Field>

          <Field
            label="Starts"
            htmlFor="startsAt"
            hint={visibility === 'SCHEDULED' ? undefined : 'Only used when scheduled.'}
          >
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={values.startsAt}
              disabled={visibility !== 'SCHEDULED'}
            />
          </Field>

          <Field label="Ends" htmlFor="endsAt" error={error('endsAt')}>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={values.endsAt}
              disabled={visibility !== 'SCHEDULED'}
            />
          </Field>
        </div>

        <div className="mt-6 grid gap-5 border-t border-rule pt-6 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={values.featured}
              className="h-4 w-4 accent-[#9a7838]"
            />
            <span className="text-[14px] text-ink">Feature on the home page</span>
          </label>

          <Field label="Order in the shop" htmlFor="sortOrder" hint="Lower shows first.">
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={values.sortOrder}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Promotion"
        description="Discounts every candle in this collection at once. If a candle already has a deeper sale of its own, that one is kept — the discounts do not stack."
      >
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="saleActive"
            checked={saleActive}
            onChange={(e) => setSaleActive(e.target.checked)}
            className="h-4 w-4 accent-[#9a7838]"
          />
          <span className="text-[14px] text-ink">Run a promotion on this collection</span>
        </label>

        <div className="mt-5 grid gap-5 sm:grid-cols-[12rem_1fr] sm:items-end">
          <Field label="Discount" htmlFor="salePercent" error={error('salePercent')}>
            <div className="flex items-center gap-2">
              <Input
                id="salePercent"
                name="salePercent"
                type="number"
                min={0}
                max={90}
                value={salePercent}
                onChange={(e) => setSalePercent(Number(e.target.value) || 0)}
                disabled={!saleActive}
              />
              <span className="text-[14px] text-ink-soft">%</span>
            </div>
          </Field>
          <p className="pb-2.5 text-[13.5px] text-ink-soft">
            {saleActive && salePercent > 0
              ? `All ${productIds.length} candle${productIds.length === 1 ? '' : 's'} in this collection show ${salePercent}% off.`
              : 'Turn the promotion on and set a discount above zero.'}
          </p>
        </div>
      </Card>

      <Card
        title="Candles"
        description="Pick what belongs in this collection."
        actions={
          <span className="text-[12.5px] text-ink-soft">
            {productIds.length} selected
          </span>
        }
      >
        <input type="hidden" name="productIds" value={productIds.join(',')} />

        {products.length > 8 ? (
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candles…"
            aria-label="Search candles"
            className="mb-4"
          />
        ) : null}

        {products.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">
            No candles yet.{' '}
            <Link
              href="/store-portal/products/new"
              className="underline decoration-ink-soft/50 underline-offset-2 hover:text-ink"
            >
              Add one first
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {matching.map((product) => {
              const checked = productIds.includes(product.id)
              return (
                <li key={product.id}>
                  <label
                    className={[
                      'flex cursor-pointer items-center gap-3 border p-2.5 transition-colors',
                      checked
                        ? 'border-gild-deep/50 bg-gild/8'
                        : 'border-rule bg-surface hover:border-ink/25',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setProductIds((current) =>
                          e.target.checked
                            ? [...current, product.id]
                            : current.filter((id) => id !== product.id),
                        )
                      }
                      className="h-4 w-4 shrink-0 accent-[#9a7838]"
                    />
                    <span className="relative h-11 w-9 shrink-0 overflow-hidden bg-parchment">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink">
                        {product.name}
                      </span>
                      <span className="text-[12px] text-ink-soft">
                        {product.priceLabel}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {matching.length === 0 && products.length > 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">
            Nothing matches “{search}”.
          </p>
        ) : null}
      </Card>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-rule bg-parchment/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <SaveButton isNew={!values.id} />
        <Link href="/store-portal/collections">
          <PortalButton type="button" tone="secondary">
            Cancel
          </PortalButton>
        </Link>
        {values.id ? <DeleteButton id={values.id} name={values.name} /> : null}
      </div>
    </form>
  )
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Create collection' : 'Save changes'}
    </PortalButton>
  )
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <PortalButton
        type="button"
        tone="ghost"
        className="ml-auto"
        onClick={() => setConfirming(true)}
      >
        Delete
      </PortalButton>
    )
  }

  return (
    <span className="ml-auto flex items-center gap-3">
      <span className="text-[13px] text-ink-soft">
        Delete {name}? The candles stay.
      </span>
      <PortalButton type="button" tone="danger" size="sm" onClick={() => deleteCollection(id)}>
        Yes, delete
      </PortalButton>
      <PortalButton type="button" tone="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </PortalButton>
    </span>
  )
}
