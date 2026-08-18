'use client'

import { useRef } from 'react'
import {
  AVAILABILITY,
  SORTS,
  type FilterOption,
  type FilterState,
} from '@/lib/product-filters'

/**
 * Filters for the candles page.
 *
 * Three dropdowns rather than rows of loose links: a shelf this size needs
 * narrowing down, not a wall of every crystal and scent laid out at once, and
 * ragged rows of links never line up however carefully they are spaced.
 *
 * They sit in a real GET form and navigate the ordinary way, so the whole
 * thing works with no JavaScript at all and every filtered view has a URL worth
 * sharing. Scripting only adds the convenience of not having to press Apply.
 *
 * Client-side routing was tried here first and could not be relied on: pushing
 * the new route succeeded roughly half the time, because the page prefetches a
 * link for every candle on it and those requests would cancel the navigation
 * mid-flight. A filter that quietly ignores every other click is worse than one
 * that costs a page load, so the browser does the navigating.
 */
export function ProductFilters({
  state,
  collections,
  resultCount,
  totalCount,
}: {
  state: FilterState
  collections: FilterOption[]
  resultCount: number
  totalCount: number
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const filtered = Boolean(state.collection) || state.availability !== 'all'

  /** A control left at its default is left out of the address entirely. */
  const isDefault = (name: string, value: string) =>
    !value || value === 'all' || (name === 'sort' && value === 'featured')

  function apply() {
    const form = formRef.current
    if (!form) return

    // A disabled control is not submitted, which is how the defaults are kept
    // out of the query string without having to build the URL by hand.
    const selects = [...form.querySelectorAll('select')]
    for (const select of selects) {
      select.disabled = isDefault(select.name, select.value)
    }
    form.submit()
    // Should the navigation be interrupted, the controls must not be left
    // greyed out and unusable.
    window.setTimeout(() => {
      for (const select of selects) select.disabled = false
    }, 2000)
  }

  return (
    <div className="border-b border-wax/10 pb-8">
      <form
        ref={formRef}
        method="get"
        action="/products"
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
        className="flex flex-wrap items-end gap-x-6 gap-y-5"
      >
        {collections.length > 0 ? (
          <Field
            key={`collection-${state.collection}`}
            label="Collection"
            name="collection"
            value={state.collection}
            onPick={apply}
          >
            <option value="">All collections</option>
            {collections.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </Field>
        ) : null}

        <Field
          key={`availability-${state.availability}`}
          label="Availability"
          name="availability"
          value={state.availability}
          onPick={apply}
        >
          {AVAILABILITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Field>

        <Field
          key={`sort-${state.sort}`}
          label="Sort"
          name="sort"
          value={state.sort}
          onPick={apply}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Field>

        {/* Without JavaScript the change handler never runs, so the form needs
            a way to be sent. It is hidden once scripting is available. */}
        <noscript>
          <button
            type="submit"
            className="label-sm h-9 border border-wax/25 px-4 text-wax transition-colors hover:border-gild hover:text-gild"
          >
            Apply
          </button>
        </noscript>
      </form>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <p className="label-sm text-smoke">
          {resultCount === totalCount
            ? `${totalCount} candle${totalCount === 1 ? '' : 's'}`
            : `${resultCount} of ${totalCount} candles`}
        </p>
        {filtered ? (
          // A plain anchor, for the same reason the form navigates plainly.
          <a
            href="/products"
            className="label-sm text-gild underline decoration-gild/40 underline-offset-[5px] transition-opacity hover:opacity-75"
          >
            Clear filters
          </a>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One labelled dropdown.
 *
 * The native control is kept and restyled rather than rebuilt: it opens as the
 * proper wheel on a phone, works by keyboard and with a screen reader for free,
 * and cannot drift out of sync with the page behind it. Only the arrow is ours.
 */
function Field({
  label,
  name,
  value,
  onPick,
  children,
}: {
  label: string
  name: string
  value: string
  onPick: () => void
  children: React.ReactNode
}) {
  return (
    // Full width stacked on a phone, natural width once they sit in a row.
    <label className="block w-full sm:w-auto">
      <span className="label-sm mb-2.5 block text-smoke">{label}</span>
      <span className="relative block">
        <select
          name={name}
          defaultValue={value}
          onChange={onPick}
          // Tells the browser to draw its own dropdown list dark, so the open
          // menu matches the page instead of flashing a white panel.
          style={{ colorScheme: 'dark' }}
          className="h-10 w-full min-w-[11.5rem] cursor-pointer appearance-none border-b border-wax/25 bg-transparent pr-7 text-[13.5px] text-wax transition-colors hover:border-wax/45 focus:border-gild focus:outline-none"
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="pointer-events-none absolute right-1.5 top-1/2 h-[5px] w-[9px] -translate-y-1/2 text-gild/70"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  )
}
