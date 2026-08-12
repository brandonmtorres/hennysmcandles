import Link from 'next/link'

export type FilterOption = { value: string; label: string; count: number }

export type FilterState = {
  collection: string
  crystal: string
  scent: string
  availability: string
  maxPrice: string
  sort: string
}

export const SORTS: { value: string; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'A to Z' },
  { value: 'newest', label: 'Newest' },
]

/**
 * Filters for the candles page.
 *
 * Every control is a link that rewrites the query string, so the whole thing
 * works without JavaScript, the back button behaves, and a filtered view can
 * be shared or bookmarked. Counts are shown next to each option so nobody
 * clicks into an empty result.
 */
export function ProductFilters({
  state,
  collections,
  crystals,
  scents,
  resultCount,
  totalCount,
}: {
  state: FilterState
  collections: FilterOption[]
  crystals: FilterOption[]
  scents: FilterOption[]
  resultCount: number
  totalCount: number
}) {
  /** Builds a URL with one facet changed, dropping defaults to keep it tidy. */
  const href = (patch: Partial<FilterState>) => {
    const next: FilterState = { ...state, ...patch }
    const params = new URLSearchParams()
    if (next.collection) params.set('collection', next.collection)
    if (next.crystal) params.set('crystal', next.crystal)
    if (next.scent) params.set('scent', next.scent)
    if (next.availability && next.availability !== 'all') {
      params.set('availability', next.availability)
    }
    if (next.maxPrice) params.set('maxPrice', next.maxPrice)
    if (next.sort && next.sort !== 'featured') params.set('sort', next.sort)
    const query = params.toString()
    return query ? `/products?${query}` : '/products'
  }

  const active =
    Boolean(state.collection) ||
    Boolean(state.crystal) ||
    Boolean(state.scent) ||
    (state.availability && state.availability !== 'all') ||
    Boolean(state.maxPrice)

  return (
    <div className="border-b border-wax/10 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {collections.length > 0 ? (
            <FacetGroup
              label="Collection"
              options={collections}
              current={state.collection}
              hrefFor={(value) => href({ collection: value })}
            />
          ) : null}

          {crystals.length > 0 ? (
            <FacetGroup
              label="Crystal"
              options={crystals}
              current={state.crystal}
              hrefFor={(value) => href({ crystal: value })}
            />
          ) : null}

          {scents.length > 0 ? (
            <FacetGroup
              label="Scent"
              options={scents}
              current={state.scent}
              hrefFor={(value) => href({ scent: value })}
            />
          ) : null}

          <FacetGroup
            label="Availability"
            options={[
              { value: 'in-stock', label: 'In stock', count: -1 },
              { value: 'on-sale', label: 'On sale', count: -1 },
            ]}
            current={state.availability === 'all' ? '' : state.availability}
            hrefFor={(value) => href({ availability: value || 'all' })}
          />

          <FacetGroup
            label="Price"
            options={[
              { value: '3000', label: 'Under $30', count: -1 },
              { value: '3500', label: 'Under $35', count: -1 },
              { value: '4000', label: 'Under $40', count: -1 },
            ]}
            current={state.maxPrice}
            hrefFor={(value) => href({ maxPrice: value })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="label-sm mb-2.5 text-smoke">Sort</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SORTS.map((option) => (
                <FacetLink
                  key={option.value}
                  href={href({ sort: option.value })}
                  selected={state.sort === option.value}
                >
                  {option.label}
                </FacetLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <p className="label-sm text-smoke">
          {resultCount === totalCount
            ? `${totalCount} candle${totalCount === 1 ? '' : 's'}`
            : `${resultCount} of ${totalCount} candles`}
        </p>
        {active ? (
          <Link
            href="/products"
            className="label-sm text-gild underline decoration-gild/40 underline-offset-[5px] transition-opacity hover:opacity-75"
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function FacetGroup({
  label,
  options,
  current,
  hrefFor,
}: {
  label: string
  options: FilterOption[]
  current: string
  hrefFor: (value: string) => string
}) {
  return (
    <div>
      <p className="label-sm mb-2.5 text-smoke">{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <FacetLink href={hrefFor('')} selected={!current}>
          All
        </FacetLink>
        {options.map((option) => (
          <FacetLink
            key={option.value}
            // Clicking the selected option again clears it.
            href={hrefFor(current === option.value ? '' : option.value)}
            selected={current === option.value}
          >
            {option.label}
            {option.count >= 0 ? (
              <span className="ml-1.5 opacity-55">{option.count}</span>
            ) : null}
          </FacetLink>
        ))}
      </div>
    </div>
  )
}

function FacetLink({
  href,
  selected,
  children,
}: {
  href: string
  selected: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? 'true' : undefined}
      className={[
        'text-[12.5px] transition-colors duration-300',
        selected
          ? 'text-gild underline decoration-gild/50 underline-offset-[5px]'
          : 'text-wax/60 hover:text-wax',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}
