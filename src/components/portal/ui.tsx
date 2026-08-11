import type { ComponentPropsWithoutRef } from 'react'

/**
 * Portal building blocks.
 *
 * These are intentionally plain: the storefront gets the atmosphere, the
 * admin gets legibility. Consistent field heights, visible focus, and labels
 * that say what the owner controls rather than what the column is called.
 */

export function Card({
  title,
  description,
  children,
  actions,
  className = '',
}: {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <section className={`border border-rule bg-surface ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule px-6 py-5">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[19px] text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-soft">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-6">{children}</div>
    </section>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[11px] font-normal uppercase tracking-[0.16em] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

const controlBase =
  'w-full border border-rule bg-surface px-3.5 text-[14.5px] text-ink transition-colors ' +
  'placeholder:text-ink-soft/55 focus:border-gild-deep focus:outline-none focus:ring-1 focus:ring-gild-deep/30 ' +
  'disabled:bg-parchment disabled:text-ink-soft'

export function Input(props: ComponentPropsWithoutRef<'input'>) {
  const { className = '', ...rest } = props
  return <input className={`${controlBase} h-11 ${className}`} {...rest} />
}

export function Textarea(props: ComponentPropsWithoutRef<'textarea'>) {
  const { className = '', ...rest } = props
  return <textarea className={`${controlBase} resize-y py-3 leading-relaxed ${className}`} {...rest} />
}

export function Select(props: ComponentPropsWithoutRef<'select'>) {
  const { className = '', children, ...rest } = props
  return (
    <select className={`${controlBase} h-11 pr-9 ${className}`} {...rest}>
      {children}
    </select>
  )
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-[11px] ' +
  'uppercase tracking-[0.16em] transition-colors duration-300 disabled:pointer-events-none disabled:opacity-45 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gild-deep'

const buttonTones = {
  primary: 'bg-ink text-wax hover:bg-[#33333c]',
  secondary: 'border border-rule bg-surface text-ink hover:border-ink/35',
  gold: 'bg-gild-deep text-white hover:bg-[#b08c43]',
  danger: 'border border-danger/45 bg-surface text-danger hover:bg-danger/8',
  ghost: 'text-ink-soft hover:text-ink',
} as const

const buttonSizes = { sm: 'h-9 px-3.5', md: 'h-11 px-5' } as const

export function PortalButton({
  tone = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  tone?: keyof typeof buttonTones
  size?: keyof typeof buttonSizes
}) {
  return (
    <button
      className={`${buttonBase} ${buttonTones[tone]} ${buttonSizes[size]} ${className}`}
      {...props}
    />
  )
}

const badgeTones = {
  neutral: 'border-rule bg-parchment text-ink-soft',
  good: 'border-success/35 bg-success/10 text-[#4d7048]',
  warn: 'border-gild-deep/40 bg-gild/12 text-gild-deep',
  bad: 'border-danger/35 bg-danger/10 text-danger',
} as const

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof badgeTones
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[2px] border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${badgeTones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Order status expressed in the owner's language, not the database's. */
export function OrderStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PAID':
      return <Badge tone="warn">To pack</Badge>
    case 'FULFILLED':
      return <Badge tone="good">Shipped</Badge>
    case 'REFUNDED':
      return <Badge tone="bad">Refunded</Badge>
    case 'CANCELLED':
      return <Badge tone="bad">Cancelled</Badge>
    default:
      return <Badge>Pending</Badge>
  }
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="text-2xl" aria-hidden="true">
        ☾
      </span>
      <p className="mt-5 font-[family-name:var(--font-display)] text-[20px] text-ink">
        {title}
      </p>
      <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail?: string
  tone?: 'warn' | 'bad'
}) {
  const valueColor =
    tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-gild-deep' : 'text-ink'
  return (
    <div className="border border-rule bg-surface px-5 py-5">
      <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <p
        className={`mt-3 font-[family-name:var(--font-display)] text-[30px] leading-none tabular-nums ${valueColor}`}
      >
        {value}
      </p>
      {detail ? <p className="mt-2.5 text-[12.5px] text-ink-soft">{detail}</p> : null}
    </div>
  )
}
