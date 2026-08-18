'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero's living atmosphere.
 *
 * This deliberately does *not* draw a flame — the photograph underneath has a
 * real one. The canvas adds what a still image cannot: embers lifting off the
 * heat and carrying on the air.
 *
 * One canvas spans the whole hero rather than one per column. Embers are born
 * at the flame on the right and drift left across the type, which is what ties
 * the two halves together — with a canvas per side they read as two unrelated
 * panels sitting next to each other.
 *
 * The loop pauses off-screen and never starts under reduced motion.
 */

type Ember = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  warm: boolean
  wobble: number
  /** 0 far, 1 near. Drives size, speed and brightness together. */
  depth: number
}

export function Atmosphere({
  className = '',
  /** Where the heat comes from, 0–1 across the canvas. */
  sourceX = 0.74,
  sourceY = 0.5,
  emberCount = 120,
  /** How strongly the air carries embers sideways, in px/frame. */
  drift = -0.34,
}: {
  className?: string
  sourceX?: number
  sourceY?: number
  emberCount?: number
  drift?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let frame = 0
    let running = true
    let time = 0

    const embers: Ember[] = []

    const resetEmber = (e: Ember, seed = false) => {
      // Born in a pocket around the flame, wide enough that a crowded field
      // still reads as air off the heat rather than a jet from one point.
      e.x = width * sourceX + (Math.random() - 0.5) * width * 0.13
      e.y = height * sourceY + (Math.random() - 0.5) * height * 0.16

      // Depth, 0 far to 1 near. Distant embers are smaller, slower and dimmer,
      // which is what keeps a dense field looking like layers of air instead of
      // one flat swarm — the thing that goes wrong when you simply add more.
      e.depth = Math.random() ** 1.5
      const near = 0.45 + e.depth * 0.55

      e.vx = drift * (0.5 + Math.random()) * near
      e.vy = -(0.16 + Math.random() * 0.34) * near
      e.radius = 0.35 + e.depth * 1.75
      // Long enough to actually cross the frame. At the previous life an ember
      // covered barely a hundred and fifty pixels before dying, so the field
      // stayed a halo around the flame and never became the drift over the type
      // that ties the two columns together.
      e.maxLife = 1500 + Math.random() * 1500
      e.life = 0
      e.warm = Math.random() > 0.3
      e.wobble = Math.random() * Math.PI * 2

      // On the very first build the field is dealt out mid-journey rather than
      // all stacked on the flame, so the drift is already there when the page
      // opens instead of taking half a minute to spread. Each seeded ember is
      // moved to where its age would have carried it.
      if (seed) {
        e.life = Math.random() * e.maxLife
        e.x += drift * (0.6 + e.depth * 0.4) * e.life
        e.y += (e.vy * (1 - 0.9985 ** e.life)) / 0.0015
      }
    }

    const build = () => {
      embers.length = 0
      // Scaled to width so a wide hero is not sparse.
      const count = Math.round(emberCount * Math.min(1.5, Math.max(0.5, width / 1200)))
      for (let i = 0; i < count; i += 1) {
        const e: Ember = {
          x: 0, y: 0, vx: 0, vy: 0, radius: 1,
          life: 0, maxLife: 1, warm: true, wobble: 0, depth: 1,
        }
        resetEmber(e, true)
        embers.push(e)
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    const render = () => {
      if (!running) return
      time += 1
      context.clearRect(0, 0, width, height)

      // A breathing pool of candlelight at the source, which also washes
      // leftward so the light belongs to the whole frame.
      const breath = 0.86 + 0.14 * Math.sin(time * 0.021) + 0.05 * Math.sin(time * 0.077)
      const gx = width * sourceX
      const gy = height * sourceY
      const glow = context.createRadialGradient(
        gx, gy, 0,
        gx, gy, Math.max(width, height) * 0.72 * breath,
      )
      glow.addColorStop(0, `rgba(255,168,88,${0.13 * breath})`)
      glow.addColorStop(0.4, `rgba(255,132,48,${0.05 * breath})`)
      glow.addColorStop(1, 'rgba(255,120,40,0)')
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)

      for (const e of embers) {
        e.life += 1
        // Retire once spent or once it has drifted clear of the frame.
        if (e.life > e.maxLife || e.y < -30 || e.x < -40 || e.x > width + 40) {
          resetEmber(e)
          continue
        }

        const progress = e.life / e.maxLife

        // Carried by a steady breeze rather than coasting to a stop.
        //
        // Sideways speed used to be damped towards zero every frame, which
        // capped how far an ember could ever travel at a couple of hundred
        // pixels however long it lived — the reason the field stayed bunched
        // around the flame. Now it relaxes towards the speed of the air itself,
        // so an ember keeps moving for as long as it burns and genuinely
        // crosses the hero from the candle to the type.
        const wind = drift * (0.6 + e.depth * 0.4)
        e.vx += (wind - e.vx) * 0.006

        // The wobble keeps paths from looking ruled.
        e.wobble += 0.011
        e.vx += Math.sin(e.wobble) * 0.008
        e.x += e.vx
        e.y += e.vy
        e.vy *= 0.9985

        // Held bright for most of the crossing, then let go. Fading linearly
        // from birth meant the average ember sat at about a quarter strength,
        // so adding more of them mostly added more things too faint to see.
        const entry = progress < 0.08 ? progress / 0.08 : 1
        const exit = progress < 0.74 ? 1 : Math.max(0, 1 - (progress - 0.74) / 0.26)

        // Dissolve only at the very edge, so embers stay lit right across the
        // type — that crossing is what makes the two columns read as one frame.
        const lateral = Math.max(0.12, Math.min(1, e.x / (width * 0.12)))

        // Distant embers sit back rather than all burning at one brightness.
        const presence = 0.58 + e.depth * 0.42
        context.globalAlpha = entry * exit * lateral * presence * (e.warm ? 0.82 : 0.4)
        context.fillStyle = e.warm ? '#ffb15e' : '#e8dfcd'
        context.beginPath()
        context.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      frame = window.requestAnimationFrame(render)
    }

    resize()
    if (reduceMotion) {
      const onResizeStatic = () => resize()
      window.addEventListener('resize', onResizeStatic)
      return () => window.removeEventListener('resize', onResizeStatic)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (!running) {
            running = true
            frame = window.requestAnimationFrame(render)
          }
        } else {
          running = false
          window.cancelAnimationFrame(frame)
        }
      },
      { threshold: 0 },
    )
    observer.observe(canvas)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    frame = window.requestAnimationFrame(render)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [sourceX, sourceY, emberCount, drift])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
