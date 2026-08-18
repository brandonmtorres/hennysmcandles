'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { recordAudit, requireUser } from '@/lib/auth'
import { fieldErrors } from '@/lib/validation'
import { updateSettings } from '@/lib/settings'

export type PopupState = {
  errors?: Record<string, string>
  message?: string
  error?: string
}

const schema = z.object({
  // Capped well under 100 because the price is what is left after it, and a
  // 100% discount is a giveaway rather than an offer.
  discountPercent: z.coerce.number().int().min(0).max(90),
  welcomeCode: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Z0-9-]*$/, 'Letters, numbers and dashes only.')
    .default(''),
  eyebrow: z.string().trim().max(40).default(''),
  headingLead: z.string().trim().max(40).default(''),
  headingTail: z.string().trim().max(60).default(''),
  body: z.string().trim().min(1, 'Say what they are signing up for.').max(400),
  button: z.string().trim().min(1, 'The button needs a label.').max(40),
  delaySeconds: z.coerce.number().int().min(0).max(300),
  scrollPercent: z.coerce.number().int().min(0).max(100),
})

export async function savePopup(
  _previous: PopupState,
  formData: FormData,
): Promise<PopupState> {
  const user = await requireUser()

  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const enabled = formData.get('enabled') === 'on'

  const parsed = schema.safeParse({
    discountPercent: text('discountPercent'),
    welcomeCode: text('welcomeCode').toUpperCase(),
    eyebrow: text('eyebrow'),
    headingLead: text('headingLead'),
    headingTail: text('headingTail'),
    body: text('body'),
    button: text('button'),
    delaySeconds: text('delaySeconds'),
    scrollPercent: text('scrollPercent'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  const v = parsed.data

  // Both triggers off with the popup on would mean it never appears, which is
  // not what anybody means to configure. Say so rather than saving a puzzle.
  if (enabled && v.delaySeconds === 0 && v.scrollPercent === 0) {
    return {
      error:
        'With both triggers at 0 the popup would never appear. Set a delay or a scroll point, or switch the popup off.',
    }
  }

  // Anything unexpected in here becomes a sentence the owner can act on. Left
  // to throw, it surfaces as the browser's own error screen on a page they were
  // in the middle of editing, with no clue whether the change was saved.
  try {
    await updateSettings({
      newsletterPopupEnabled: enabled,
      newsletterDiscountPercent: v.discountPercent,
      newsletterWelcomeCode: v.welcomeCode,
      newsletterPopupEyebrow: v.eyebrow,
      newsletterPopupHeadingLead: v.headingLead,
      newsletterPopupHeadingTail: v.headingTail,
      newsletterPopupBody: v.body,
      newsletterPopupButton: v.button,
      newsletterPopupDelaySeconds: v.delaySeconds,
      newsletterPopupScrollPercent: v.scrollPercent,
    })

    await recordAudit({
      user,
      action: 'newsletter.popup_update',
      entity: 'settings',
      meta: { enabled, discountPercent: v.discountPercent },
    })
  } catch (error) {
    console.error('[popup] Could not save the invitation:', error)
    return { error: 'That could not be saved just now. Try again in a moment.' }
  }

  // The shop reads these on every page, so the whole storefront is stale.
  revalidatePath('/', 'layout')
  revalidatePath('/store-portal/newsletter/popup')

  return { message: enabled ? 'Saved. The popup is live.' : 'Saved. The popup is off.' }
}
