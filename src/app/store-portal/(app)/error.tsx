'use client'

import { useEffect, useState } from 'react'

/**
 * The portal's own error screen.
 *
 * Without this, a failure here fell through to the shop's error page — black
 * background, "the flame went out", and a Try again that often could not fix
 * it. Two things are different now.
 *
 * The first is plain recovery. React's `reset` re-renders the same code, which
 * is the right move for a query that failed once. It cannot help when the
 * browser is holding script from a build that no longer exists — the usual
 * result of the app being rebuilt while a tab sat open — because the missing
 * file is still missing. That needs a real reload, so both are offered and the
 * reload is the one described as the fix.
 *
 * The second is the reference. Every error carries a digest, and the matching
 * line in the server log holds the actual message. Showing it means a report
 * can be traced instead of guessed at.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    console.error(error)
    // A chunk that will not load is the signature of an out-of-date tab.
    const message = `${error.name} ${error.message}`
    setStale(/chunk|loading css|dynamically imported module|Failed to fetch/i.test(message))
  }, [error])

  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        Something went wrong
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-[30px] leading-tight text-ink">
        {stale ? 'This page is out of date' : 'That did not load'}
      </h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-[14px] leading-relaxed text-ink-soft">
        {stale
          ? 'The shop has been updated since this tab was opened, so part of the page is missing. Reloading fetches the current version.'
          : 'Nothing was changed. Reloading the page usually clears it — if it keeps happening, the reference below points at the cause in the logs.'}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-surface transition-opacity hover:opacity-85"
        >
          Reload the page
        </button>
        {stale ? null : (
          <button
            type="button"
            onClick={reset}
            className="h-11 border border-rule px-6 text-[11px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-gild-deep"
          >
            Try again
          </button>
        )}
      </div>

      {error.digest ? (
        <p className="mt-8 text-[11.5px] tracking-[0.08em] text-ink-soft/70">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  )
}
