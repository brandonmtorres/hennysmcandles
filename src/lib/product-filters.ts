/**
 * The shape of the candles-page filters, shared by the server page that reads
 * the query string and the client component that renders the controls.
 *
 * It lives apart from the component because that component is a client module:
 * a plain value exported from one and imported by a server component arrives as
 * a reference to the client bundle rather than the value itself, so `SORTS`
 * would not be an array by the time the page tried to search it.
 */

export type FilterOption = { value: string; label: string; count: number }

export type FilterState = {
  collection: string
  availability: string
  sort: string
}

export const SORTS: { value: string; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'A to Z' },
  { value: 'newest', label: 'Newest' },
]

export const AVAILABILITY: { value: string; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'on-sale', label: 'On sale' },
]
