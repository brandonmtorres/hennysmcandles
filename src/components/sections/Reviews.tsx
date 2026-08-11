import { LitSection } from '@/components/visual/LitSection'
export type ReviewItem = {
  id: string
  author: string
  rating: number
  title: string | null
  body: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-1.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={i < rating ? 'fill-gild' : 'fill-wax/20'}
        >
          <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z" />
        </svg>
      ))}
    </span>
  )
}

export function Reviews({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) return null

  return (
    <LitSection
      className="border-t border-wax/8 bg-pitch px-5 py-24 sm:px-8"
      aria-labelledby="reviews-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="display-md reveal text-wax" id="reviews-heading">
            In other people&rsquo;s <span className="italic text-gild">homes</span>
          </h2>
          <p className="label-sm reveal text-smoke">Verified buyers</p>
        </div>

        <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <li
              key={review.id}
              className="reveal border-t border-wax/12 pt-7"
              style={{ '--reveal-delay': `${i * 100}ms` } as React.CSSProperties}
            >
              <Stars rating={review.rating} />
              {review.title ? (
                <p className="display-sm mt-5 text-wax">&ldquo;{review.title}&rdquo;</p>
              ) : null}
              <p className="mt-4 text-[14.5px] leading-[1.75] text-smoke">{review.body}</p>
              <p className="label-sm mt-6 text-gild/80">{review.author}</p>
            </li>
          ))}
        </ul>
      </div>
    </LitSection>
  )
}
