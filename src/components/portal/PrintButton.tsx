'use client'

import { PortalButton } from '@/components/portal/ui'

/** Prints the current page. Hidden from the printed sheet itself. */
export function PrintButton() {
  return (
    <PortalButton type="button" tone="primary" size="sm" onClick={() => window.print()}>
      Print this slip
    </PortalButton>
  )
}
