'use client'

import { useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/money'
import type { ProductCard } from '@/lib/products'

/** Quantity selector plus add-to-cart, kept together so they share state. */
export function PurchasePanel({ product }: { product: ProductCard }) {
  const { add, lines } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const alreadyInCart = lines.find((l) => l.productId === product.id)?.quantity ?? 0
  const remaining = Math.max(0, product.stock - alreadyInCart)
  const canAdd = product.inStock && remaining > 0

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-wax">
          {formatMoney(product.effectivePriceCents)}
        </span>
        {product.discounted ? (
          <>
            <span className="text-[15px] text-smoke line-through">
              {formatMoney(product.priceCents)}
            </span>
            <span className="label-sm bg-gild px-2 py-1 text-pitch">
              Save {product.salePercent}%
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-[13px] text-smoke">
        {product.sizeOz} oz · Free shipping on orders over $75
      </p>

      <div className="mt-8 flex flex-wrap items-stretch gap-3">
        <div className="flex items-center border border-wax/18">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-14 w-12 items-center justify-center text-[17px] text-moon transition-colors hover:text-wax disabled:opacity-30"
          >
            −
          </button>
          <span
            className="w-10 text-center text-[15px] tabular-nums text-wax"
            aria-live="polite"
            aria-label={`Quantity ${quantity}`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(remaining || 1, q + 1))}
            disabled={quantity >= remaining}
            aria-label="Increase quantity"
            className="flex h-14 w-12 items-center justify-center text-[17px] text-moon transition-colors hover:text-wax disabled:opacity-30"
          >
            +
          </button>
        </div>

        <Button
          size="lg"
          disabled={!canAdd}
          className="min-w-[15rem] flex-1"
          onClick={() => {
            add(
              {
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.effectivePriceCents,
                image: product.images[0]?.url ?? '',
                maxStock: product.stock,
              },
              quantity,
            )
            setAdded(true)
            setQuantity(1)
            window.setTimeout(() => setAdded(false), 2000)
          }}
        >
          {!product.inStock
            ? 'Sold out'
            : remaining === 0
              ? 'All in your cart'
              : added
                ? 'Added to cart'
                : 'Add to cart'}
        </Button>
      </div>

      <p className="mt-4 text-[12.5px] text-smoke" role="status">
        {!product.inStock ? (
          <span className="text-danger">
            Sold out — the next batch is poured every few weeks.
          </span>
        ) : product.stock <= 3 ? (
          <span className="text-gild">
            Only {product.stock} left from this pour.
          </span>
        ) : (
          'In stock · ships in 1–2 days'
        )}
      </p>
    </div>
  )
}
