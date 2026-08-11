'use client'

import { useEffect } from 'react'

/**
 * Drives the page's two scroll behaviours from a single pair of observers,
 * mounted once in the storefront layout rather than once per section.
 *
 *  1. `.reveal` elements fade up the first time they enter view.
 *  2. `[data-lit]` sections receive a `--warmth` value between 0 and 1 as the
 *     travelling light source reaches them — the tagline, made literal.
 */
export function ScrollChoreography() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // --- Reveals ----------------------------------------------------------
    const revealTargets = document.querySelectorAll<HTMLElement>('.reveal')

    if (reduceMotion) {
      revealTargets.forEach((el) => el.classList.add('is-visible'))
    }

    const revealObserver = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-visible')
                revealObserver?.unobserve(entry.target)
              }
            }
          },
          { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
        )

    if (revealObserver) revealTargets.forEach((el) => revealObserver.observe(el))

    // --- The travelling light --------------------------------------------
    const litSections = document.querySelectorAll<HTMLElement>('[data-lit]')

    // Warmth peaks when a section's centre is nearest the viewport centre.
    const warmthObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          if (!entry.isIntersecting) {
            el.style.setProperty('--warmth', '0')
            continue
          }
          const rect = entry.boundingClientRect
          const viewportCentre = window.innerHeight / 2
          const sectionCentre = rect.top + rect.height / 2
          const distance = Math.abs(sectionCentre - viewportCentre)
          const falloff = Math.max(window.innerHeight, rect.height) * 0.9
          const warmth = Math.max(0, Math.min(1, 1 - distance / falloff))
          el.style.setProperty('--warmth', warmth.toFixed(3))
        }
      },
      {
        // Many thresholds give a smooth ramp without a scroll listener.
        threshold: Array.from({ length: 21 }, (_, i) => i / 20),
      },
    )

    litSections.forEach((el) => warmthObserver.observe(el))

    return () => {
      revealObserver?.disconnect()
      warmthObserver.disconnect()
    }
  }, [])

  return null
}
