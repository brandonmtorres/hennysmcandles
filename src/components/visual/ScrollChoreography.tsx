'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Drives the page's scroll behaviour from a single set of observers.
 *
 *  1. `.reveal` elements fade up as they enter view.
 *  2. `--dawn` on the document tracks how close the travelling light is,
 *     which the fixed backdrop reads to warm the whole page continuously.
 *
 * Two things this has to get right, both learned the hard way:
 *
 *  · It must re-run on navigation. The storefront layout never remounts, so
 *    an effect that queried `.reveal` once left every soft-navigated page
 *    permanently invisible.
 *  · The trigger must be generous. A negative `rootMargin` combined with a
 *    non-zero `threshold` meant a tall tile just below the fold intersected
 *    by less than the threshold and never fired at all, so content sat at
 *    zero opacity until the visitor scrolled far past it.
 */
export function ScrollChoreography() {
  const pathname = usePathname()

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ---------------------------------------------------------------------
    // Reveals
    // ---------------------------------------------------------------------
    const show = (el: Element) => el.classList.add('is-visible')

    if (reduceMotion) {
      document.querySelectorAll('.reveal').forEach(show)
      return
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target)
            revealObserver.unobserve(entry.target)
          }
        }
      },
      {
        // Start the reveal slightly before the element arrives, and accept any
        // intersection at all. Anything already on screen resolves immediately
        // because IntersectionObserver reports on first observe.
        root: null,
        rootMargin: '0px 0px 140px 0px',
        threshold: 0,
      },
    )

    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        revealObserver.observe(el)
      })
    }

    observeAll()

    // Catch anything React adds later — streamed segments, or a page that
    // finishes rendering after this effect has run.
    const mutations = new MutationObserver(observeAll)
    mutations.observe(document.body, { childList: true, subtree: true })

    // Belt and braces: if anything is still hidden while sitting on screen a
    // moment later, show it. Content must never be stuck invisible.
    const sweep = window.setTimeout(() => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 1.2 && rect.bottom > 0) show(el)
      })
    }, 900)

    // ---------------------------------------------------------------------
    // The travelling light
    // ---------------------------------------------------------------------
    // `--dawn` peaks where the page is brightest and falls away either side,
    // so the whole document warms and cools as one continuous movement rather
    // than switching between hard-edged sections.
    const root = document.documentElement
    let frame = 0

    const updateDawn = () => {
      frame = 0
      const anchor = document.querySelector('[data-dawn-anchor]')
      const viewportCentre = window.innerHeight / 2

      let dawn = 0
      if (anchor) {
        const rect = anchor.getBoundingClientRect()
        const anchorCentre = rect.top + rect.height / 2
        const distance = Math.abs(anchorCentre - viewportCentre)
        // Reach extends roughly a viewport and a half either side of the
        // bright section, which is what makes the change read as gradual.
        const reach = window.innerHeight * 1.5 + rect.height / 2
        dawn = Math.max(0, 1 - distance / reach)
        // Ease it so the middle of the transition moves faster than the tails.
        dawn = dawn * dawn * (3 - 2 * dawn)
      }

      root.style.setProperty('--dawn', dawn.toFixed(4))

      // Overall scroll progress, used for the parallax on the starfield.
      const max = document.body.scrollHeight - window.innerHeight
      root.style.setProperty(
        '--scroll-progress',
        max > 0 ? (window.scrollY / max).toFixed(4) : '0',
      )
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateDawn)
    }

    updateDawn()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      revealObserver.disconnect()
      mutations.disconnect()
      window.clearTimeout(sweep)
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // Re-running on pathname is the whole point: a soft navigation replaces
    // the page's DOM while this component stays mounted.
  }, [pathname])

  return null
}
