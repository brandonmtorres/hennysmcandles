'use client'

import { useEffect, useState } from 'react'

/**
 * Copies a block of text — an address, a tracking number — to the clipboard.
 *
 * Retyping an address into a postage label is where a parcel goes to the wrong
 * street, so the address the customer actually gave is one click from the
 * label. Confirmation is shown on the button itself rather than as a toast,
 * because the answer belongs where the question was asked.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
}: {
  value: string
  label?: string
  copiedLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard access can be refused — an insecure origin, or a browser
      // that wants a gesture it did not see. Selecting the text by hand still
      // works, so this stays quiet rather than throwing an error at someone
      // mid-pack.
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-[11px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gild-deep"
    >
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  )
}
