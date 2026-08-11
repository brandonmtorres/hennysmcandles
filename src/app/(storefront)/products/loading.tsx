/**
 * Shown while the catalogue is fetched. Mirrors the real grid's proportions so
 * the page does not jump when the products arrive.
 */
export default function ProductsLoading() {
  return (
    <>
      <header className="border-b border-wax/8 bg-obsidian px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="skeleton h-3 w-28 rounded-[2px]" />
          <div className="skeleton mt-6 h-12 w-full max-w-lg rounded-[2px]" />
          <div className="skeleton mt-4 h-4 w-full max-w-md rounded-[2px]" />
        </div>
      </header>

      <section className="bg-obsidian px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="skeleton h-3 w-20 rounded-[2px]" />
          <div className="mt-10 grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/5] w-full" />
                <div className="skeleton mt-5 h-6 w-2/3 rounded-[2px]" />
                <div className="skeleton mt-3 h-3 w-1/2 rounded-[2px]" />
                <div className="skeleton mt-3 h-3 w-1/3 rounded-[2px]" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <span className="sr-only" role="status">
        Loading the collection
      </span>
    </>
  )
}
