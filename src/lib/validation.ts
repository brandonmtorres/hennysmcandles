import { z } from 'zod'

/**
 * Every value that crosses a trust boundary is parsed here first.
 * Nothing from a request body or form is used before passing through a schema.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email('Enter a valid email address.')

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')

/** Checkout accepts only IDs and quantities — never prices. */
export const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(20),
})

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Your cart is empty.').max(30),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
})

export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
})

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200)
  .refine((v) => /[a-z]/.test(v), 'Include a lowercase letter.')
  .refine((v) => /[A-Z]/.test(v), 'Include an uppercase letter.')
  .refine((v) => /[0-9]/.test(v), 'Include a number.')

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(120),
  slug: slugSchema,
  tagline: z.string().trim().min(2, 'Add a short tagline.').max(180),
  scent: z.string().trim().max(180).default(''),
  description: z.string().trim().min(2, 'Add a short description.').max(600),
  story: z.string().trim().max(4000).default(''),

  priceCents: z.number().int().min(0, 'Price cannot be negative.').max(1_000_000),
  salePercent: z.number().int().min(0).max(90),
  onSale: z.boolean(),

  stock: z.number().int().min(0, 'Stock cannot be negative.').max(100_000),
  lowStockThreshold: z.number().int().min(0).max(1000),
  visibility: z.enum(['VISIBLE', 'HIDDEN', 'AUTO']),

  sizeOz: z.number().min(0).max(1000),
  burnTimeHours: z.number().int().min(0).max(1000),
  wick: z.string().trim().max(120).default(''),
  wax: z.string().trim().max(120).default(''),
  crystal: z.string().trim().max(120).default(''),
  crystalMeaning: z.string().trim().max(200).default(''),
  scentTop: z.string().trim().max(200).default(''),
  scentHeart: z.string().trim().max(200).default(''),
  scentBase: z.string().trim().max(200).default(''),
  ingredients: z.string().trim().max(1000).default(''),

  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
})

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(120),
  storeEmail: emailSchema,
  shippingFlatCents: z.number().int().min(0).max(100_000),
  freeShippingThresholdCents: z.number().int().min(0).max(1_000_000),
  taxPercent: z.number().min(0).max(30),
  lowStockThreshold: z.number().int().min(0).max(1000),
  announcement: z.string().trim().max(200),
})

export const fulfilmentSchema = z.object({
  orderId: z.string().min(1).max(64),
  trackingNumber: z.string().trim().max(120).default(''),
  carrier: z.string().trim().max(60).default(''),
})

export const newsletterSchema = z.object({
  email: emailSchema,
})

/** Collapses a ZodError into a { field: message } map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
