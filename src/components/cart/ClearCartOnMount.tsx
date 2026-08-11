'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/cart/CartProvider'

/**
 * Empties the cart once the customer lands on the confirmation page.
 * Waits for hydration so it does not clear before stored lines are restored.
 */
export function ClearCartOnMount() {
  const { clear, hydrated } = useCart()

  useEffect(() => {
    if (hydrated) clear()
  }, [hydrated, clear])

  return null
}
