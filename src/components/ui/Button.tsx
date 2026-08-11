import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Buttons are set in the same wide-tracked caps as the candle labels and kept
 * almost square-cornered — the vessels have a hard edge, so the UI does too.
 */

/**
 * `onLight` variants exist because passing override classes to the dark
 * variants does not reliably win — Tailwind resolves conflicts by stylesheet
 * order, not class order, which silently produced cream text on the cream
 * section. Anything sitting on a light ground uses these instead.
 */
type Variant =
  | 'primary'
  | 'outline'
  | 'gold'
  | 'quiet'
  | 'onLight'
  | 'onLightOutline'
  | 'onLightQuiet'
type Size = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] ' +
  'font-light uppercase tracking-[0.22em] transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ' +
  'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gild'

const variants: Record<Variant, string> = {
  primary:
    'bg-wax text-obsidian hover:bg-linen shadow-[0_0_0_0_rgba(200,161,90,0)] hover:shadow-[0_10px_44px_-14px_rgba(242,234,217,0.5)]',
  outline:
    'border border-wax/25 text-wax hover:border-gild/70 hover:text-gild bg-transparent',
  gold: 'bg-gild text-pitch hover:bg-[#d8b268] shadow-[0_10px_44px_-16px_rgba(200,161,90,0.7)]',
  quiet:
    'text-moon hover:text-wax underline decoration-wax/25 underline-offset-[6px] hover:decoration-gild',

  onLight:
    'bg-obsidian text-wax hover:bg-slate shadow-[0_10px_44px_-18px_rgba(11,11,15,0.6)]',
  onLightOutline:
    'border border-obsidian/25 text-obsidian hover:border-gild-deep hover:text-gild-deep bg-transparent',
  onLightQuiet:
    'text-obsidian/65 hover:text-obsidian underline decoration-obsidian/25 underline-offset-[6px] hover:decoration-gild-deep',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[10px]',
  md: 'h-12 px-7 text-[11px]',
  lg: 'h-14 px-10 text-[11.5px]',
}

const TEXT_ONLY: Variant[] = ['quiet', 'onLightQuiet']

function classesFor(variant: Variant, size: Size, extra?: string) {
  const sizing = TEXT_ONLY.includes(variant) ? 'text-[11px]' : sizes[size]
  return [base, variants[variant], sizing, extra].filter(Boolean).join(' ')
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return <button className={classesFor(variant, size, className)} {...props} />
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: Variant
  size?: Size
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={classesFor(variant, size, className)} {...props} />
}
