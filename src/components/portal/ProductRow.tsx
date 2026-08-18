'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { setVisibility, updateStock } from '@/app/store-portal/(app)/products/actions'
import { Badge } from '@/components/portal/ui'

type Row = {
  id: string
  name: string
  slug: string
  image: string | null
  priceLabel: string
  wasPriceLabel: string | null
  salePercent: number
  stock: number
  visibility: 'VISIBLE' | 'HIDDEN' | 'AUTO'
  lowStockThreshold: number
}

const VISIBILITY_LABELS: Record<Row['visibility'], string> = {
  // AUTO is legacy: it used to hide a candle at zero stock. Sold-out candles
  // now stay listed, so it reads the same as VISIBLE wherever it survives.
  AUTO: 'Listed',
  VISIBLE: 'Listed',
  HIDDEN: 'Hidden',
}

/**
 * One product in the admin list, with the two fields the owner changes most
 * often — stock and visibility — editable in place. Everything else lives on
 * the full edit page.
 */
export function ProductRow({ product }: { product: Row }) {
  const [stock, setStock] = useState(product.stock)
  const [pending, startTransition] = useTransition()
  const [savedFlash, setSavedFlash] = useState(false)

  const commitStock = (value: number) => {
    const safe = Math.max(0, Math.round(value))
    if (safe === product.stock) return
    setStock(safe)
    startTransition(async () => {
      await updateStock(product.id, safe)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1600)
    })
  }

  const outOfStock = stock === 0
  const low = stock > 0 && stock <= product.lowStockThreshold

  return (
    <li className="px-5 py-4">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_7rem_12.5rem_10rem_5rem] lg:items-center">
        {/* Thumbnail */}
        <div className="relative hidden h-14 w-12 shrink-0 overflow-hidden bg-parchment lg:block">
          {product.image ? (
            <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
          ) : null}
        </div>

        {/* Name */}
        <div className="flex items-center gap-3 lg:block">
          <div className="relative h-12 w-10 shrink-0 overflow-hidden bg-parchment lg:hidden">
            {product.image ? (
              <Image src={product.image} alt="" fill sizes="40px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <Link
              href={`/store-portal/products/${product.id}`}
              className="block truncate text-[14.5px] text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-gild-deep"
            >
              {product.name}
            </Link>
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">/{product.slug}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 lg:block">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft lg:hidden">
            Price
          </span>
          <span className="text-[14px] tabular-nums text-ink">{product.priceLabel}</span>
          {product.wasPriceLabel ? (
            <span className="ml-2 text-[12px] text-ink-soft line-through">
              {product.wasPriceLabel}
            </span>
          ) : null}
        </div>

        {/* Stock */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft lg:hidden">
            Stock
          </span>
          <div className="flex items-center border border-rule">
            <button
              type="button"
              onClick={() => commitStock(stock - 1)}
              disabled={pending || stock <= 0}
              aria-label={`Reduce stock of ${product.name}`}
              className="flex h-9 w-8 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
              onBlur={(e) => commitStock(Number(e.target.value) || 0)}
              aria-label={`Stock for ${product.name}`}
              className="h-9 w-12 border-x border-rule bg-transparent text-center text-[13.5px] tabular-nums text-ink focus:outline-none focus:ring-1 focus:ring-gild-deep/40"
            />
            <button
              type="button"
              onClick={() => commitStock(stock + 1)}
              disabled={pending}
              aria-label={`Increase stock of ${product.name}`}
              className="flex h-9 w-8 items-center justify-center text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
            >
              +
            </button>
          </div>
          {savedFlash ? (
            <span className="text-[11px] text-[#4d7048]" role="status">
              Saved
            </span>
          ) : outOfStock ? (
            <Badge tone="bad">Sold out</Badge>
          ) : low ? (
            <Badge tone="warn">Low</Badge>
          ) : null}
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-soft lg:hidden">
            Shown
          </span>
          <select
            // A legacy AUTO row shows as Listed, which is how it now behaves.
            // Without this the control would render with nothing selected.
            value={product.visibility === 'AUTO' ? 'VISIBLE' : product.visibility}
            aria-label={`Whether ${product.name} is listed on the shop`}
            onChange={(e) =>
              startTransition(async () => {
                await setVisibility(product.id, e.target.value as Row['visibility'])
              })
            }
            className="h-9 w-full max-w-[10rem] border border-rule bg-surface px-2.5 text-[12.5px] text-ink focus:border-gild-deep focus:outline-none"
          >
            {(['VISIBLE', 'HIDDEN'] as const).map((value) => (
              <option key={value} value={value}>
                {VISIBILITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {/* Edit */}
        <div className="lg:text-right">
          <Link
            href={`/store-portal/products/${product.id}`}
            className="text-[12px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
          >
            Edit
          </Link>
        </div>
      </div>
    </li>
  )
}
