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
}

export function Atmosphere({
  className = '',
  /** Where the heat comes from, 0–1 across the canvas. */
  sourceX = 0.74,
  sourceY = 0.5,
  emberCount = 46,
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
      // Born in a small pocket around the flame.
      e.x = width * sourceX + (Math.random() - 0.5) * width * 0.07
      e.y = height * sourceY + (Math.random() - 0.5) * height * 0.1
      e.vx = drift * (0.5 + Math.random())
      e.vy = -(0.16 + Math.random() * 0.34)
      e.radius = 0.5 + Math.random() * 1.7
      e.maxLife = 420 + Math.random() * 520
      e.life = seed ? Math.random() * e.maxLife : 0
      e.warm = Math.random() > 0.3
      e.wobble = Math.random() * Math.PI * 2
    }

    const build = () => {
      embers.length = 0
      // Scaled to width so a wide hero is not sparse.
      const count = Math.round(emberCount * Math.min(1.5, Math.max(0.5, width / 1200)))
      for (let i = 0; i < count; i += 1) {
        const e: Ember = {
          x: 0, y: 0, vx: 0, vy: 0, radius: 1,
          life: 0, maxLife: 1, warm: true, wobble: 0,
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

        // Rising air wanders; the wobble keeps paths from looking ruled.
        e.wobble += 0.011
        e.vx += Math.sin(e.wobble) * 0.008
        e.vx *= 0.995
        e.x += e.vx
        e.y += e.vy
        e.vy *= 0.9985

        // Fade in fast and out slowly. Embers hold full brightness across most
        // of the frame and only dissolve in the last stretch on the left —
        // they are meant to carry over the type, since that crossing is what
        // joins the two columns.
        const entry = progress < 0.1 ? progress / 0.1 : 1
        const exit = Math.max(0, 1 - (progress - 0.1) / 0.9)
        const lateral = Math.max(0.22, Math.min(1, e.x / (width * 0.26)))

        context.globalAlpha = entry * exit * lateral * (e.warm ? 0.72 : 0.34)
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
