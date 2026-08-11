'use client'

import { useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import { Button } from '@/components/ui/Button'
import type { ProductCard } from '@/lib/products'

export function AddToCartButton({
  product,
  quantity = 1,
  size = 'md',
  variant = 'primary',
  className = '',
  label = 'Add to cart',
}: {
  product: ProductCard
  quantity?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline' | 'gold'
  className?: string
  label?: string
}) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  if (!product.inStock) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        Sold out
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        add(
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.effectivePriceCents,
            image: product.images[0]?.url ?? '/images/products/black-sea-mist.jpeg',
            maxStock: product.stock,
          },
          quantity,
        )
        setAdded(true)
        window.setTimeout(() => setAdded(false), 1800)
      }}
    >
      {added ? 'Added' : label}
    </Button>
  )
}
