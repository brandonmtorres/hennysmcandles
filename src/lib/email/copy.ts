import { db } from '@/lib/db'

/**
 * The words in the shop's automatic emails.
 *
 * Two things are separated on purpose. The *layout* of an email — masthead,
 * item table, totals, address block — lives in `templates.ts` and is not
 * editable, because it is fiddly, has to survive Outlook, and nobody running a
 * candle studio wants to maintain table markup. The *wording* lives here and
 * in the database, because that is what an owner actually wants to change:
 * the tone, the promise about dispatch times, the note about the first burn.
 *
 * Defaults are held in code rather than seeded into the database, so a shop
 * that has never opened the editor still sends something written in the
 * brand's voice — and so improving the default copy reaches every shop that
 * has not overridden it.
 */

export type EmailTemplateKey = 'order_confirmation' | 'shipping_notice'

export type EmailCopy = {
  subject: string
  heading: string
  intro: string
  outro: string
}

/**
 * The tokens an owner may use, with what each one becomes.
 *
 * Kept as data rather than prose so the editor can list them without the
 * documentation drifting from what the renderer actually replaces.
 */
export const EMAIL_TOKENS: { token: string; describes: string }[] = [
  { token: '{{first_name}}', describes: 'The customer’s first name, or “there”' },
  { token: '{{name}}', describes: 'Their full name as given at checkout' },
  { token: '{{order_number}}', describes: 'e.g. HM-1042' },
  { token: '{{total}}', describes: 'The order total, e.g. $54.95' },
  { token: '{{tracking}}', describes: 'Tracking number — shipped email only' },
  { token: '{{carrier}}', describes: 'Carrier name — shipped email only' },
  { token: '{{shop}}', describes: 'The shop name from Settings' },
]

export const EMAIL_DEFAULTS: Record<EmailTemplateKey, EmailCopy> = {
  order_confirmation: {
    subject: 'Order {{order_number}} confirmed · {{shop}}',
    heading: 'Thank you, {{first_name}}.',
    intro: `Your candles are confirmed, and order {{order_number}} is now on the studio bench.

Each one is poured, set with its crystal and finished by hand, so give us a day or two before it ships. We will email you the moment it is on its way.`,
    outro: `A note on your first burn: let the wax melt all the way to the edge, about two to three hours. It sets the memory of the pool and stops the candle tunnelling later.`,
  },
  shipping_notice: {
    subject: 'Order {{order_number}} is on its way',
    heading: 'It is on its way, {{first_name}}.',
    intro: `Order {{order_number}} has left the studio, wrapped and boxed by hand.

Give it two to five days. Glass and wax travel well enough, but if anything arrives less than perfect, send us a photo and we will put it right.`,
    outro: `Trim the wick to about a quarter inch before every burn. It keeps the flame steady and the glass clean.`,
  },
}

/** The copy for one email, as edited, falling back to the brand default. */
export async function getEmailCopy(key: EmailTemplateKey): Promise<EmailCopy> {
  const row = await db.emailTemplate.findUnique({ where: { key } })
  const fallback = EMAIL_DEFAULTS[key]
  if (!row) return fallback

  // A field emptied in the editor falls back rather than sending a blank
  // heading — except the outro, which is legitimately optional.
  return {
    subject: row.subject.trim() || fallback.subject,
    heading: row.heading.trim() || fallback.heading,
    intro: row.intro.trim() || fallback.intro,
    outro: row.outro,
  }
}

export async function saveEmailCopy(key: EmailTemplateKey, copy: EmailCopy): Promise<void> {
  await db.emailTemplate.upsert({
    where: { key },
    create: { key, ...copy },
    update: copy,
  })
}

/** Puts one email back to the wording it shipped with. */
export async function resetEmailCopy(key: EmailTemplateKey): Promise<void> {
  await db.emailTemplate.deleteMany({ where: { key } })
}

export type TokenValues = {
  first_name: string
  name: string
  order_number: string
  total: string
  tracking: string
  carrier: string
  shop: string
}

/**
 * Substitutes tokens.
 *
 * Unknown tokens are left exactly as typed rather than blanked. If someone
 * writes {{adress}}, seeing it in the preview tells them they mistyped it;
 * silently deleting it would not.
 */
export function fillTokens(text: string, values: TokenValues): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => {
    const value = (values as Record<string, string | undefined>)[name]
    return value === undefined ? whole : value
  })
}
