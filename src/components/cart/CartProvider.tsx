'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

/**
 * Cart state, persisted to localStorage.
 *
 * Prices held here are for display only. The server recomputes every amount
 * from the database when the Square payment link is created, so tampering
 * with localStorage changes nothing about what a customer is charged.
 */

export type CartLine = {
  productId: string
  slug: string
  name: string
  priceCents: number
  image: string
  quantity: number
  maxStock: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  subtotalCents: number
  isOpen: boolean
  hydrated: boolean
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  open: () => void
  close: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'hm_cart_v1'

function isValidLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false
  const l = value as Record<string, unknown>
  return (
    typeof l.productId === 'string' &&
    typeof l.slug === 'string' &&
    typeof l.name === 'string' &&
    typeof l.priceCents === 'number' &&
    typeof l.quantity === 'number' &&
    l.quantity > 0
  )
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Restore once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) setLines(parsed.filter(isValidLine))
      }
    } catch {
      // Corrupt or unavailable storage is not worth surfacing — start empty.
    }
    setHydrated(true)
  }, [])

  // Persist after hydration so we never overwrite storage with the empty
  // initial state on first render.
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* quota or private mode — ignore */
    }
  }, [lines, hydrated])

  // Close the drawer on Escape.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  const add = useCallback((line: Omit<CartLine, 'quantity'>, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === line.productId)
      if (existing) {
        const capped = Math.min(existing.quantity + quantity, line.maxStock || 99)
        return current.map((l) =>
          l.productId === line.productId ? { ...l, ...line, quantity: capped } : l,
        )
      }
      return [...current, { ...line, quantity: Math.min(quantity, line.maxStock || 99) }]
    })
    setIsOpen(true)
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) =>
            l.productId === productId
              ? { ...l, quantity: Math.min(quantity, l.maxStock || 99) }
              : l,
          ),
    )
  }, [])

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId))
  }, [])

  const clear = useCallback(() => setLines([]), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0)
    const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0)
    return {
      lines,
      count,
      subtotalCents,
      isOpen,
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
      open,
      close,
    }
  }, [lines, isOpen, hydrated, add, setQuantity, remove, clear, open, close])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside a CartProvider.')
  return context
}
