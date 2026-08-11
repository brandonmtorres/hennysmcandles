import { formatMoney } from '@/lib/money'

/**
 * Transactional email templates.
 *
 * Table-based layout with inline styles — the only thing that renders
 * predictably across Outlook, Gmail and Apple Mail. A dark masthead carries
 * the brand; the body stays light so the order details are easy to read.
 */

const OBSIDIAN = '#0b0b0f'
const WAX = '#f2ead9'
const GILD = '#c8a15a'
const INK = '#1c1c22'
const MUTED = '#6b6b73'
const RULE = '#e2dccd'

const SERIF = "'Didot','Bodoni MT',Georgia,'Times New Roman',serif"
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif"

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hennysmcandles.com'
}

function shell(title: string, preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#efe9dc;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9dc;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${RULE};">

        <tr>
          <td align="center" style="background:${OBSIDIAN};padding:36px 24px 30px;">
            <div style="font-family:${SERIF};font-size:27px;letter-spacing:.14em;color:${WAX};text-transform:uppercase;">Hennys M.</div>
            <div style="font-family:${SANS};font-size:10px;letter-spacing:.36em;color:${GILD};text-transform:uppercase;margin-top:9px;">Homemade Candles</div>
          </td>
        </tr>

        <tr><td style="padding:38px 34px 34px;font-family:${SANS};color:${INK};font-size:15px;line-height:1.65;">
          ${body}
        </td></tr>

        <tr>
          <td align="center" style="background:${OBSIDIAN};padding:26px 24px;font-family:${SANS};font-size:11px;line-height:1.8;color:#8a8886;">
            <div style="color:${GILD};letter-spacing:.24em;text-transform:uppercase;font-size:10px;">Bring light to your life</div>
            <div style="margin-top:12px;">
              <a href="${siteUrl()}" style="color:#8a8886;text-decoration:underline;">hennysmcandles.com</a>
              &nbsp;·&nbsp;
              <a href="https://instagram.com/hennysm.candles" style="color:#8a8886;text-decoration:underline;">@hennysm.candles</a>
            </div>
            <div style="margin-top:10px;color:#5c5c62;">Hand-poured in small batches.</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:30px;line-height:1.15;font-weight:400;color:${INK};">${escapeHtml(text)}</h1>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;"><tr>
    <td style="background:${OBSIDIAN};">
      <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${WAX};text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr></table>`
}

export type OrderEmailData = {
  orderNumber: string
  customerName: string | null
  email: string
  items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[]
  subtotalCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  currency: string
  shippingAddress?: string | null
  trackingNumber?: string | null
  carrier?: string | null
}

function itemRows(data: OrderEmailData): string {
  return data.items
    .map(
      (item) => `<tr>
        <td style="padding:13px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK};">
          ${escapeHtml(item.name)}
          <span style="color:${MUTED};"> × ${item.quantity}</span>
        </td>
        <td align="right" style="padding:13px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK};white-space:nowrap;">
          ${formatMoney(item.lineTotalCents, data.currency)}
        </td>
      </tr>`,
    )
    .join('')
}

function totalRow(label: string, value: string, bold = false): string {
  const weight = bold ? '600' : '400'
  const size = bold ? '16px' : '14px'
  const color = bold ? INK : MUTED
  return `<tr>
    <td style="padding:${bold ? '14px 0 0' : '7px 0 0'};font-family:${SANS};font-size:${size};font-weight:${weight};color:${color};">${escapeHtml(label)}</td>
    <td align="right" style="padding:${bold ? '14px 0 0' : '7px 0 0'};font-family:${SANS};font-size:${size};font-weight:${weight};color:${bold ? INK : MUTED};white-space:nowrap;">${escapeHtml(value)}</td>
  </tr>`
}

function summaryTable(data: OrderEmailData): string {
  const shipping =
    data.shippingCents === 0 ? 'Free' : formatMoney(data.shippingCents, data.currency)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">
    ${itemRows(data)}
    ${totalRow('Subtotal', formatMoney(data.subtotalCents, data.currency))}
    ${totalRow('Shipping', shipping)}
    ${data.taxCents > 0 ? totalRow('Tax', formatMoney(data.taxCents, data.currency)) : ''}
    ${totalRow('Total', formatMoney(data.totalCents, data.currency), true)}
  </table>`
}

function addressBlock(raw?: string | null): string {
  if (!raw) return ''
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return ''
  }
  const lines = [
    parsed.name,
    parsed.line1,
    parsed.line2,
    [parsed.city, parsed.state, parsed.postal_code].filter(Boolean).join(', '),
    parsed.country,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => escapeHtml(v))

  if (lines.length === 0) return ''

  return `<div style="margin-top:26px;padding-top:22px;border-top:1px solid ${RULE};">
    <div style="font-family:${SANS};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${MUTED};margin-bottom:9px;">Shipping to</div>
    <div style="font-family:${SANS};font-size:14px;line-height:1.6;color:${INK};">${lines.join('<br>')}</div>
  </div>`
}

// ---------------------------------------------------------------------------

export function orderConfirmationEmail(data: OrderEmailData) {
  const name = data.customerName?.split(' ')[0] ?? 'there'
  const body = `
    ${heading(`Thank you, ${name}.`)}
    <p style="margin:0 0 6px;color:${MUTED};">Order ${escapeHtml(data.orderNumber)}</p>
    <p style="margin:16px 0 0;">
      Your candles are confirmed. Each one is poured, set with its crystal and finished by hand,
      so give us a day or two before it ships — we will email you the moment it is on its way.
    </p>
    ${summaryTable(data)}
    ${addressBlock(data.shippingAddress)}
    <p style="margin:26px 0 0;color:${MUTED};font-size:13px;">
      A note on your first burn: let the wax melt all the way to the edge, about two to three hours.
      It sets the memory of the pool and stops the candle tunnelling later.
    </p>
    ${button(`${siteUrl()}/products`, 'Explore the collection')}
  `
  return {
    subject: `Order ${data.orderNumber} confirmed · Hennys M. Homemade Candles`,
    html: shell(
      'Order confirmed',
      `Thank you — order ${data.orderNumber} is confirmed.`,
      body,
    ),
  }
}

export function shippingNoticeEmail(data: OrderEmailData) {
  const name = data.customerName?.split(' ')[0] ?? 'there'
  const tracking = data.trackingNumber
    ? `<div style="margin-top:22px;padding:18px 20px;background:#faf7f0;border:1px solid ${RULE};">
         <div style="font-family:${SANS};font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${MUTED};">Tracking${data.carrier ? ` · ${escapeHtml(data.carrier)}` : ''}</div>
         <div style="font-family:${SANS};font-size:16px;margin-top:7px;color:${INK};letter-spacing:.04em;">${escapeHtml(data.trackingNumber)}</div>
       </div>`
    : ''
  const body = `
    ${heading(`It is on its way, ${name}.`)}
    <p style="margin:0 0 6px;color:${MUTED};">Order ${escapeHtml(data.orderNumber)}</p>
    <p style="margin:16px 0 0;">Your order has left the studio.</p>
    ${tracking}
    ${summaryTable(data)}
    ${addressBlock(data.shippingAddress)}
  `
  return {
    subject: `Your order ${data.orderNumber} has shipped`,
    html: shell('Your order has shipped', `Order ${data.orderNumber} is on its way.`, body),
  }
}

export function ownerNewOrderEmail(data: OrderEmailData) {
  const body = `
    ${heading('New order')}
    <p style="margin:0 0 6px;color:${MUTED};">${escapeHtml(data.orderNumber)} · ${escapeHtml(data.email)}</p>
    ${summaryTable(data)}
    ${addressBlock(data.shippingAddress)}
    ${button(`${siteUrl()}/store-portal/orders`, 'Open the portal')}
  `
  return {
    subject: `New order ${data.orderNumber} · ${formatMoney(data.totalCents, data.currency)}`,
    html: shell('New order', `New order ${data.orderNumber}.`, body),
  }
}

export function lowStockEmail(items: { name: string; stock: number }[]) {
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:11px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${INK};">${escapeHtml(i.name)}</td>
          <td align="right" style="padding:11px 0;border-bottom:1px solid ${RULE};font-family:${SANS};font-size:14px;color:${i.stock === 0 ? '#c05f4e' : INK};">${i.stock === 0 ? 'Sold out' : `${i.stock} left`}</td>
        </tr>`,
    )
    .join('')

  const body = `
    ${heading('Time to pour more')}
    <p style="margin:0;">These are running low:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">${rows}</table>
    ${button(`${siteUrl()}/store-portal/products`, 'Update stock')}
  `
  return {
    subject: `Low stock: ${items.length} candle${items.length === 1 ? '' : 's'} need attention`,
    html: shell('Low stock', 'Some candles are running low.', body),
  }
}
