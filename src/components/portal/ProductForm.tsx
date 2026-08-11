'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  saveProduct,
  deleteProduct,
  type ProductFormState,
} from '@/app/store-portal/(app)/products/actions'
import {
  Card,
  Field,
  Input,
  PortalButton,
  Select,
  Textarea,
} from '@/components/portal/ui'

export type ProductFormValues = {
  id: string | null
  name: string
  slug: string
  tagline: string
  scent: string
  description: string
  story: string
  price: string
  salePercent: number
  onSale: boolean
  stock: number
  lowStockThreshold: number
  visibility: string
  sizeOz: number
  burnTimeHours: number
  wick: string
  wax: string
  crystal: string
  crystalMeaning: string
  scentTop: string
  scentHeart: string
  scentBase: string
  ingredients: string
  featured: boolean
  sortOrder: number
  images: { url: string; alt: string }[]
}

export function ProductForm({ values }: { values: ProductFormValues }) {
  const action = saveProduct.bind(null, values.id)
  const [state, formAction] = useActionState<ProductFormState, FormData>(action, {})
  const [onSale, setOnSale] = useState(values.onSale)
  const [salePercent, setSalePercent] = useState(values.salePercent)
  const [price, setPrice] = useState(values.price)
  const [images, setImages] = useState(
    values.images.length > 0 ? values.images : [{ url: '', alt: '' }],
  )

  const error = (key: string) => state.errors?.[key]

  const priceNumber = Number.parseFloat(price.replace(/[^0-9.]/g, '')) || 0
  const salePrice = onSale && salePercent > 0
    ? (priceNumber * (1 - salePercent / 100)).toFixed(2)
    : null

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card
        title="The basics"
        description="What the candle is called and how it is introduced on the shop."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={error('name')}>
            <Input
              id="name"
              name="name"
              defaultValue={values.name}
              required
              maxLength={120}
              placeholder="Black Sea Mist"
            />
          </Field>

          <Field
            label="Web address"
            htmlFor="slug"
            error={error('slug')}
            hint="Leave blank to build it from the name."
          >
            <Input
              id="slug"
              name="slug"
              defaultValue={values.slug}
              maxLength={80}
              placeholder="black-sea-mist"
            />
          </Field>

          <Field
            label="Tagline"
            htmlFor="tagline"
            error={error('tagline')}
            hint="One line, shown under the name."
            className="sm:col-span-2"
          >
            <Input
              id="tagline"
              name="tagline"
              defaultValue={values.tagline}
              required
              maxLength={180}
              placeholder="Salt air, dark water, and a stone that keeps you steady."
            />
          </Field>

          <Field
            label="Scent line"
            htmlFor="scent"
            hint="Shown on the product card."
            className="sm:col-span-2"
          >
            <Input
              id="scent"
              name="scent"
              defaultValue={values.scent}
              maxLength={180}
              placeholder="Sea Salt · Driftwood · Bergamot"
            />
          </Field>

          <Field
            label="Short description"
            htmlFor="description"
            error={error('description')}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              required
              rows={3}
              maxLength={600}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Price and stock"
        description="Stock drops automatically when someone buys, and returns if you refund."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Price" htmlFor="price" error={error('priceCents')}>
            <Input
              id="price"
              name="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              inputMode="decimal"
              placeholder="34.00"
            />
          </Field>

          <Field
            label="In stock"
            htmlFor="stock"
            error={error('stock')}
            hint="How many you have to sell."
          >
            <Input
              id="stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={values.stock}
              required
            />
          </Field>

          <Field
            label="Warn me at"
            htmlFor="lowStockThreshold"
            hint="Low-stock email trigger."
          >
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              min={0}
              defaultValue={values.lowStockThreshold}
            />
          </Field>

          <Field
            label="Show on shop"
            htmlFor="visibility"
            hint="“While in stock” hides it at zero."
          >
            <Select id="visibility" name="visibility" defaultValue={values.visibility}>
              <option value="AUTO">While in stock</option>
              <option value="VISIBLE">Always</option>
              <option value="HIDDEN">Never — hidden</option>
            </Select>
          </Field>
        </div>

        <div className="mt-6 border-t border-rule pt-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="onSale"
              checked={onSale}
              onChange={(e) => setOnSale(e.target.checked)}
              className="h-4 w-4 accent-[#9a7838]"
            />
            <span className="text-[14px] text-ink">Put this candle on sale</span>
          </label>

          {onSale ? (
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
                  />
                  <span className="text-[14px] text-ink-soft">%</span>
                </div>
              </Field>
              <p className="pb-2.5 text-[13.5px] text-ink-soft">
                {salePrice ? (
                  <>
                    Customers will pay{' '}
                    <strong className="text-ink">${salePrice}</strong> instead of $
                    {priceNumber.toFixed(2)}.
                  </>
                ) : (
                  'Set a discount above zero to change the price.'
                )}
              </p>
            </div>
          ) : (
            <input type="hidden" name="salePercent" value={0} />
          )}
        </div>
      </Card>

      <Card title="The detail" description="What appears on the candle's own page.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Size (oz)" htmlFor="sizeOz">
            <Input
              id="sizeOz"
              name="sizeOz"
              type="number"
              step="0.5"
              min={0}
              defaultValue={values.sizeOz}
            />
          </Field>
          <Field label="Burn time (hours)" htmlFor="burnTimeHours">
            <Input
              id="burnTimeHours"
              name="burnTimeHours"
              type="number"
              min={0}
              defaultValue={values.burnTimeHours}
            />
          </Field>
          <Field label="Order in the shop" htmlFor="sortOrder" hint="Lower shows first.">
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={values.sortOrder}
            />
          </Field>

          <Field label="Wax" htmlFor="wax">
            <Input id="wax" name="wax" defaultValue={values.wax} maxLength={120} />
          </Field>
          <Field label="Wick" htmlFor="wick">
            <Input id="wick" name="wick" defaultValue={values.wick} maxLength={120} />
          </Field>
          <Field label="Crystal" htmlFor="crystal">
            <Input
              id="crystal"
              name="crystal"
              defaultValue={values.crystal}
              maxLength={120}
              placeholder="Black Tourmaline"
            />
          </Field>

          <Field
            label="What the crystal means"
            htmlFor="crystalMeaning"
            className="sm:col-span-3"
          >
            <Input
              id="crystalMeaning"
              name="crystalMeaning"
              defaultValue={values.crystalMeaning}
              maxLength={200}
              placeholder="Protection and grounding"
            />
          </Field>

          <Field label="Top notes" htmlFor="scentTop">
            <Input id="scentTop" name="scentTop" defaultValue={values.scentTop} maxLength={200} />
          </Field>
          <Field label="Heart notes" htmlFor="scentHeart">
            <Input
              id="scentHeart"
              name="scentHeart"
              defaultValue={values.scentHeart}
              maxLength={200}
            />
          </Field>
          <Field label="Base notes" htmlFor="scentBase">
            <Input
              id="scentBase"
              name="scentBase"
              defaultValue={values.scentBase}
              maxLength={200}
            />
          </Field>

          <Field label="Ingredients" htmlFor="ingredients" className="sm:col-span-3">
            <Textarea
              id="ingredients"
              name="ingredients"
              defaultValue={values.ingredients}
              rows={2}
              maxLength={1000}
            />
          </Field>

          <Field
            label="The story"
            htmlFor="story"
            hint="A few paragraphs. Separate them with a blank line."
            className="sm:col-span-3"
          >
            <Textarea
              id="story"
              name="story"
              defaultValue={values.story}
              rows={8}
              maxLength={4000}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Photographs"
        description="Paths to images in the public folder, for example /images/products/black-sea-mist.jpeg. The first is used on the card."
      >
        <input
          type="hidden"
          name="images"
          value={images.map((i) => i.url).filter(Boolean).join('\n')}
        />

        <div className="flex flex-col gap-4">
          {images.map((image, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={`Image ${index + 1}`} htmlFor={`image-url-${index}`}>
                <Input
                  id={`image-url-${index}`}
                  value={image.url}
                  onChange={(e) =>
                    setImages((current) =>
                      current.map((img, i) =>
                        i === index ? { ...img, url: e.target.value } : img,
                      ),
                    )
                  }
                  placeholder="/images/products/example.jpeg"
                />
              </Field>
              <Field label="Describe it (for screen readers)" htmlFor={`alt-${index}`}>
                <Input
                  id={`alt-${index}`}
                  name={`alt-${index}`}
                  value={image.alt}
                  onChange={(e) =>
                    setImages((current) =>
                      current.map((img, i) =>
                        i === index ? { ...img, alt: e.target.value } : img,
                      ),
                    )
                  }
                  placeholder="Black Sea Mist candle burning beside raw tourmaline"
                />
              </Field>
              <PortalButton
                type="button"
                tone="ghost"
                size="sm"
                className="mb-1"
                onClick={() =>
                  setImages((current) =>
                    current.length === 1
                      ? [{ url: '', alt: '' }]
                      : current.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </PortalButton>
            </div>
          ))}
        </div>

        {images.length < 8 ? (
          <PortalButton
            type="button"
            tone="secondary"
            size="sm"
            className="mt-5"
            onClick={() => setImages((current) => [...current, { url: '', alt: '' }])}
          >
            Add another image
          </PortalButton>
        ) : null}
      </Card>

      <Card title="Placement">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={values.featured}
            className="h-4 w-4 accent-[#9a7838]"
          />
          <span className="text-[14px] text-ink">
            Feature this candle on the home page
          </span>
        </label>
      </Card>

      {state.errors?.form ? (
        <p role="alert" className="border border-danger/40 bg-danger/8 px-5 py-3 text-[13.5px] text-danger">
          {state.errors.form}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-rule bg-parchment/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <SaveButton isNew={!values.id} />
        <Link href="/store-portal/products">
          <PortalButton type="button" tone="secondary">
            Cancel
          </PortalButton>
        </Link>

        {values.id ? <DeleteButton productId={values.id} name={values.name} /> : null}
      </div>
    </form>
  )
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus()
  return (
    <PortalButton type="submit" tone="primary" disabled={pending}>
      {pending ? 'Saving…' : isNew ? 'Add candle' : 'Save changes'}
    </PortalButton>
  )
}

function DeleteButton({ productId, name }: { productId: string; name: string }) {
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
      <span className="text-[13px] text-ink-soft">Delete {name}?</span>
      <PortalButton
        type="button"
        tone="danger"
        size="sm"
        onClick={() => deleteProduct(productId)}
      >
        Yes, delete
      </PortalButton>
      <PortalButton
        type="button"
        tone="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Keep it
      </PortalButton>
    </span>
  )
}
