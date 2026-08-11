export default function ProductLoading() {
  return (
    <div className="border-b border-wax/8 bg-obsidian px-5 pb-14 pt-10 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="skeleton mb-10 h-3 w-52 rounded-[2px]" />

        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <div className="skeleton aspect-[4/5] w-full" />
            <div className="mt-3 flex gap-3">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="skeleton aspect-square w-20" />
              ))}
            </div>
          </div>

          <div>
            <div className="skeleton h-3 w-40 rounded-[2px]" />
            <div className="skeleton mt-5 h-11 w-3/4 rounded-[2px]" />
            <div className="skeleton mt-5 h-3 w-2/3 rounded-[2px]" />
            <div className="skeleton mt-7 h-4 w-full rounded-[2px]" />

            <div className="mt-10 border-t border-wax/12 pt-10">
              <div className="skeleton h-9 w-32 rounded-[2px]" />
              <div className="mt-8 flex gap-3">
                <div className="skeleton h-14 w-32" />
                <div className="skeleton h-14 flex-1" />
              </div>
            </div>

            <div className="mt-12 border-t border-wax/12 pt-10">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton mt-4 h-3 w-full rounded-[2px] first:mt-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading this candle
      </span>
    </div>
  )
}
