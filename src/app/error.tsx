'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-obsidian px-6 py-24 text-center">
      <div className="max-w-md">
        <span className="block text-4xl" aria-hidden="true">
          ☾
        </span>
        <p className="label mt-9 text-gild/90">Something went wrong</p>
        <h1 className="display-md mt-5 text-wax">The flame went out</h1>
        <p className="lede mt-5">
          An unexpected error stopped this page loading. Trying again usually works.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-9 inline-flex h-12 items-center justify-center rounded-[2px] bg-wax px-7 text-[11px] uppercase tracking-[0.22em] text-obsidian transition-colors hover:bg-linen"
        >
          Try again
        </button>
        {error.digest ? (
          <p className="mt-7 text-[11px] tracking-[0.1em] text-smoke/60">
            Reference {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  )
}
