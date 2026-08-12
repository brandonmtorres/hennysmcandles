'use client'

import { useEffect, useRef } from 'react'
import type { Weather } from '@/lib/themes'

/**
 * The weather inside a seasonal band.
 *
 * Each season moves differently, and the movement is most of what gives a
 * theme its character: snow settles straight and slow, leaves tumble end over
 * end, petals seesaw as they fall, pollen hangs and drifts upward in the heat.
 * A single shared "falling dots" effect would make every season feel the same
 * in a different colour.
 *
 * The loop pauses when the band scrolls away, and never starts at all under
 * reduced motion — the band keeps its colours and motifs either way.
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  spin: number
  spinRate: number
  sway: number
  swayRate: number
  alpha: number
}

type Look = {
  count: number
  /** Draws one particle at the origin, already rotated. */
  draw: (ctx: CanvasRenderingContext2D, size: number, colour: string) => void
  spawn: (width: number, height: number, seeded: boolean) => Partial<Particle>
  /** Whether particles rise instead of fall. */
  rising?: boolean
}

const LOOKS: Record<Weather, Look> = {
  snow: {
    count: 46,
    draw: (ctx, size, colour) => {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    },
    spawn: (w, h, seeded) => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -12,
      vy: 0.22 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.16,
      size: 1.4 + Math.random() * 3,
      swayRate: 0.008 + Math.random() * 0.014,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.3 + Math.random() * 0.55,
      spinRate: 0,
    }),
  },

  leaves: {
    count: 22,
    draw: (ctx, size, colour) => {
      // A simple lozenge with a midrib — enough to read as a leaf in motion.
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.quadraticCurveTo(size * 0.72, 0, 0, size)
      ctx.quadraticCurveTo(-size * 0.72, 0, 0, -size)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(0, size)
      ctx.stroke()
    },
    spawn: (w, h, seeded) => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -20,
      vy: 0.32 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.5,
      size: 4 + Math.random() * 6,
      spinRate: (Math.random() - 0.5) * 0.045,
      swayRate: 0.012 + Math.random() * 0.02,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.34 + Math.random() * 0.42,
    }),
  },

  petals: {
    count: 26,
    draw: (ctx, size, colour) => {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.ellipse(0, 0, size * 0.55, size, 0, 0, Math.PI * 2)
      ctx.fill()
    },
    spawn: (w, h, seeded) => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -16,
      vy: 0.26 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.42,
      size: 3 + Math.random() * 4.5,
      spinRate: (Math.random() - 0.5) * 0.05,
      // A wide, slow seesaw — petals fall further sideways than they do down.
      swayRate: 0.016 + Math.random() * 0.022,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.3 + Math.random() * 0.4,
    }),
  },

  blossom: {
    count: 24,
    draw: (ctx, size, colour) => {
      // Five small petals around a centre.
      ctx.fillStyle = colour
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.ellipse(
          Math.cos(angle) * size * 0.5,
          Math.sin(angle) * size * 0.5,
          size * 0.38,
          size * 0.26,
          angle,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    },
    spawn: (w, h, seeded) => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -18,
      vy: 0.2 + Math.random() * 0.38,
      vx: (Math.random() - 0.5) * 0.34,
      size: 3.2 + Math.random() * 4,
      spinRate: (Math.random() - 0.5) * 0.03,
      swayRate: 0.014 + Math.random() * 0.018,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.26 + Math.random() * 0.36,
    }),
  },

  pollen: {
    count: 40,
    rising: true,
    draw: (ctx, size, colour) => {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    },
    spawn: (w, h, seeded) => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : h + 12,
      // Hanging in warm air rather than falling.
      vy: -(0.08 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.22,
      size: 1.2 + Math.random() * 2.6,
      swayRate: 0.01 + Math.random() * 0.016,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.2 + Math.random() * 0.5,
      spinRate: 0,
    }),
  },
}

export function SeasonalWeather({
  weather,
  colour,
  className = '',
  density = 1,
}: {
  weather: Weather
  colour: string
  className?: string
  /** Scales the particle count — the portal preview uses less. */
  density?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const look = LOOKS[weather]
    let width = 0
    let height = 0
    let frame = 0
    let running = true

    const particles: Particle[] = []

    const make = (seeded: boolean): Particle => ({
      x: 0, y: 0, vx: 0, vy: 0, size: 2,
      spin: Math.random() * Math.PI * 2,
      spinRate: 0, sway: 0, swayRate: 0.01, alpha: 0.4,
      ...look.spawn(width, height, seeded),
    })

    const build = () => {
      particles.length = 0
      // Scaled to width so a wide band is not sparse and a phone is not busy.
      const count = Math.round(
        look.count * density * Math.min(1.4, Math.max(0.45, width / 1200)),
      )
      for (let i = 0; i < count; i += 1) particles.push(make(true))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    const render = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.sway += p.swayRate
        p.spin += p.spinRate
        p.x += p.vx + Math.sin(p.sway) * 0.5
        p.y += p.vy

        const gone = look.rising ? p.y < -20 : p.y > height + 20
        if (gone || p.x < -40 || p.x > width + 40) {
          Object.assign(p, make(false))
          continue
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        if (p.spinRate !== 0) ctx.rotate(p.spin)
        ctx.globalAlpha = p.alpha
        look.draw(ctx, p.size, colour)
        ctx.restore()
      }

      ctx.globalAlpha = 1
      frame = window.requestAnimationFrame(render)
    }

    resize()

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
  }, [weather, colour, density])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
