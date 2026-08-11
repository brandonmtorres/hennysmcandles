'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero's living atmosphere.
 *
 * This deliberately does *not* draw a flame — the photograph underneath has a
 * real one. The canvas adds what a still image cannot: embers lifting on the
 * heat, dust catching the light, and a glow that breathes. Augmenting real
 * photography reads as believable where a drawn flame reads as synthetic.
 *
 * The loop pauses when the canvas scrolls out of view and never starts at all
 * when the visitor prefers reduced motion.
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
}

type Star = {
  x: number
  y: number
  radius: number
  phase: number
  speed: number
}

export function Atmosphere({
  className = '',
  /** Horizontal origin of the heat source, 0–1 across the canvas. */
  sourceX = 0.5,
  /** Vertical origin of the heat source, 0–1 down the canvas. */
  sourceY = 0.72,
  emberCount = 26,
  starCount = 60,
}: {
  className?: string
  sourceX?: number
  sourceY?: number
  emberCount?: number
  starCount?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let running = true
    let time = 0

    const embers: Ember[] = []
    const stars: Star[] = []

    const resetEmber = (e: Ember, seed = false) => {
      const spread = width * 0.07
      e.x = width * sourceX + (Math.random() - 0.5) * spread
      e.y = height * sourceY - (seed ? Math.random() * height * 0.4 : 0)
      e.vx = (Math.random() - 0.5) * 0.16
      e.vy = -(0.18 + Math.random() * 0.42)
      e.radius = 0.5 + Math.random() * 1.5
      e.maxLife = 180 + Math.random() * 260
      e.life = seed ? Math.random() * e.maxLife : 0
      e.warm = Math.random() > 0.28
    }

    const build = () => {
      embers.length = 0
      for (let i = 0; i < emberCount; i += 1) {
        const e: Ember = {
          x: 0, y: 0, vx: 0, vy: 0, radius: 1, life: 0, maxLife: 1, warm: true,
        }
        resetEmber(e, true)
        embers.push(e)
      }

      stars.length = 0
      for (let i = 0; i < starCount; i += 1) {
        stars.push({
          x: Math.random() * width,
          // Stars live in the upper two-thirds — the sky, not the table.
          y: Math.random() * height * 0.66,
          radius: Math.random() < 0.85 ? 0.6 : 1.1,
          phase: Math.random() * Math.PI * 2,
          speed: 0.004 + Math.random() * 0.012,
        })
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    const drawStatic = () => {
      context.clearRect(0, 0, width, height)
      for (const s of stars) {
        context.globalAlpha = 0.34
        context.fillStyle = '#f2ead9'
        context.beginPath()
        context.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1
    }

    const render = () => {
      if (!running) return
      time += 1
      context.clearRect(0, 0, width, height)

      // --- Stars: slow, unsynchronised twinkle -----------------------------
      for (const s of stars) {
        const twinkle = 0.3 + 0.34 * Math.sin(s.phase + time * s.speed)
        context.globalAlpha = Math.max(0, twinkle)
        context.fillStyle = '#f2ead9'
        context.beginPath()
        context.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        context.fill()
      }

      // --- The breathing pool of candlelight -------------------------------
      const breath = 0.86 + 0.14 * Math.sin(time * 0.021) + 0.05 * Math.sin(time * 0.077)
      const glowRadius = Math.min(width, height) * 0.46 * breath
      const gx = width * sourceX
      const gy = height * sourceY
      const glow = context.createRadialGradient(gx, gy, 0, gx, gy, glowRadius)
      glow.addColorStop(0, `rgba(255,168,88,${0.14 * breath})`)
      glow.addColorStop(0.45, `rgba(255,132,48,${0.05 * breath})`)
      glow.addColorStop(1, 'rgba(255,120,40,0)')
      context.globalAlpha = 1
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)

      // --- Embers -----------------------------------------------------------
      for (const e of embers) {
        e.life += 1
        if (e.life > e.maxLife || e.y < -20) {
          resetEmber(e)
          continue
        }

        const progress = e.life / e.maxLife
        // Rising air pushes embers sideways in a slow, wandering drift.
        e.vx += Math.sin((e.y + time) * 0.012) * 0.006
        e.vx *= 0.99
        e.x += e.vx
        e.y += e.vy
        e.vy *= 0.998

        // Fade in quickly, out slowly.
        const alpha =
          progress < 0.12
            ? progress / 0.12
            : Math.max(0, 1 - (progress - 0.12) / 0.88)

        context.globalAlpha = alpha * (e.warm ? 0.62 : 0.3)
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
      drawStatic()
      return () => {}
    }

    // Only animate while visible — an off-screen canvas should cost nothing.
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
  }, [sourceX, sourceY, emberCount, starCount])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
