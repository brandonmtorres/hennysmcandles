'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, recordAudit } from '@/lib/auth'
import { updateSettings } from '@/lib/settings'
import { fieldErrors, settingsSchema } from '@/lib/validation'
import { parsePriceToCents } from '@/lib/money'

export type SettingsState = {
  errors?: Record<string, string>
  message?: string
}

export async function saveSettings(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser()
  const text = (key: string) => String(formData.get(key) ?? '').trim()

  const parsed = settingsSchema.safeParse({
    storeName: text('storeName'),
    storeEmail: text('storeEmail'),
    shippingFlatCents: parsePriceToCents(text('shippingFlat')) ?? 0,
    freeShippingThresholdCents: parsePriceToCents(text('freeShippingThreshold')) ?? 0,
    taxPercent: Number.parseFloat(text('taxPercent')) || 0,
    lowStockThreshold: Number.parseInt(text('lowStockThreshold'), 10) || 0,
    announcement: text('announcement'),
  })

  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  await updateSettings(parsed.data)
  await recordAudit({ user, action: 'settings.update', meta: parsed.data })

  revalidatePath('/store-portal/settings')
  revalidatePath('/', 'layout')

  return { message: 'Settings saved.' }
}
