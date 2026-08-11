'use client'

import { useEffect, useState } from 'react'

/** A short-lived confirmation after a redirect. Dismisses itself. */
export function SavedNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <p
      role="status"
      className="mb-6 border border-success/35 bg-success/10 px-5 py-3 text-[13.5px] text-[#4d7048]"
    >
      {message}
    </p>
  )
}
