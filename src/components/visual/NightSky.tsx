'use client'

import { useEffect, useRef } from 'react'

/**
 * A fixed starfield behind the entire site.
 *
 * Three layers at different depths drift at different rates as the page
 * scrolls, which is what makes the sky feel like it has depth rather than
 * like a texture pinned to the screen. Stars are drawn as soft points with a
 * faint four-point flare on the brightest few; a shooting star crosses every
 * so often, never on a predictable beat.
 *
 * The whole thing pauses when the tab is hidden and is replaced by a single
 * static frame when reduced motion is requested.
 */

type Star = {
  x: number
  y: number
  radius: number
  depth: number // 0 = far, 1 = near — drives both parallax and brightness
  phase: number
  speed: number
  flare: boolean
}

type Shooter = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  length: number
}

export function NightSky() {
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
    let time = 0
    let running = true

    const stars: Star[] = []
    // Slow motes of dust catching the light — the thing you only notice in a
    // room lit by one candle.
    const motes: {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      alpha: number
    }[] = []
    let shooter: Shooter | null = null
    let nextShooter = 340 + Math.random() * 700

    const build = () => {
      stars.length = 0
      // Density scaled to area so a wide monitor is not sparse and a phone
      // is not overcrowded.
      const count = Math.min(320, Math.round((width * height) / 5200))
      for (let i = 0; i < count; i += 1) {
        const depth = Math.random()
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.35 + depth * 1.25,
          depth,
          phase: Math.random() * Math.PI * 2,
          speed: 0.006 + Math.random() * 0.02,
          flare: depth > 0.88,
        })
      }

      motes.length = 0
      const moteCount = Math.min(40, Math.round((width * height) / 34000))
      for (let i = 0; i < moteCount; i += 1) {
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.14,
          vy: -(0.05 + Math.random() * 0.16),
          radius: 0.5 + Math.random() * 1.3,
          alpha: 0.08 + Math.random() * 0.2,
        })
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    /** Scroll progress, read from the variable ScrollChoreography maintains. */
    const readProgress = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(
        '--scroll-progress',
      )
      const value = Number.parseFloat(raw)
      return Number.isFinite(value) ? value : 0
    }

    /** Dawn dims the stars — they fade out as the light comes up. */
    const readDawn = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--dawn')
      const value = Number.parseFloat(raw)
      return Number.isFinite(value) ? value : 0
    }

    let progress = 0
    let dawn = 0
    let sampleCounter = 0

    const drawStar = (star: Star, alpha: number, offsetY: number) => {
      const y = ((star.y - offsetY) % height + height) % height
      context.globalAlpha = alpha
      context.fillStyle = '#f4efe4'
      context.beginPath()
      context.arc(star.x, y, star.radius, 0, Math.PI * 2)
      context.fill()

      if (star.flare && alpha > 0.4) {
        // A restrained cross flare on the brightest stars only.
        const len = star.radius * 5.5
        context.globalAlpha = alpha * 0.4
        context.strokeStyle = '#f4efe4'
        context.lineWidth = 0.5
        context.beginPath()
        context.moveTo(star.x - len, y)
        context.lineTo(star.x + len, y)
        context.moveTo(star.x, y - len)
        context.lineTo(star.x, y + len)
        context.stroke()
      }
    }

    const render = () => {
      if (!running) return
      time += 1

      // Reading computed style is not free, so sample it a few times a second
      // rather than every frame.
      sampleCounter += 1
      if (sampleCounter % 6 === 0) {
        progress = readProgress()
        dawn = readDawn()
      }

      context.clearRect(0, 0, width, height)

      const skyVisibility = 1 - dawn * 0.85

      for (const star of stars) {
        const twinkle = 0.45 + 0.4 * Math.sin(star.phase + time * star.speed)
        const alpha = Math.max(0, twinkle * (0.25 + star.depth * 0.75) * skyVisibility)
        if (alpha <= 0.01) continue
        // Nearer stars travel further — parallax across the whole document.
        const offset = progress * height * (0.25 + star.depth * 1.5)
        drawStar(star, alpha, offset)
      }

      // --- Motes -------------------------------------------------------------
      // These stay warm and keep drifting after the stars have faded out, so
      // the bright part of the page still has something alive in the air.
      for (const mote of motes) {
        mote.x += mote.vx + Math.sin((mote.y + time) * 0.004) * 0.06
        mote.y += mote.vy
        if (mote.y < -10) {
          mote.y = height + 10
          mote.x = Math.random() * width
        }
        context.globalAlpha = mote.alpha * (0.5 + dawn * 0.5)
        context.fillStyle = dawn > 0.5 ? '#c8a15a' : '#e8dfcd'
        context.beginPath()
        context.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2)
        context.fill()
      }

      // --- Shooting star -----------------------------------------------------
      nextShooter -= 1
      if (!shooter && nextShooter <= 0 && skyVisibility > 0.5) {
        const fromLeft = Math.random() > 0.5
        shooter = {
          x: fromLeft ? -40 : width + 40,
          y: Math.random() * height * 0.5,
          vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4),
          vy: 1.4 + Math.random() * 1.6,
          life: 0,
          maxLife: 70 + Math.random() * 40,
          length: 70 + Math.random() * 90,
        }
        nextShooter = 700 + Math.random() * 1600
      }

      if (shooter) {
        shooter.life += 1
        shooter.x += shooter.vx
        shooter.y += shooter.vy

        const t = shooter.life / shooter.maxLife
        const alpha = Math.sin(Math.PI * t) * 0.85 * skyVisibility
        if (alpha > 0) {
          const tailX = shooter.x - (shooter.vx / 6) * shooter.length
          const tailY = shooter.y - (shooter.vy / 6) * shooter.length
          const gradient = context.createLinearGradient(
            shooter.x,
            shooter.y,
            tailX,
            tailY,
          )
          gradient.addColorStop(0, `rgba(244,239,228,${alpha})`)
          gradient.addColorStop(0.35, `rgba(200,161,90,${alpha * 0.5})`)
          gradient.addColorStop(1, 'rgba(200,161,90,0)')
          context.globalAlpha = 1
          context.strokeStyle = gradient
          context.lineWidth = 1.5
          context.lineCap = 'round'
          context.beginPath()
          context.moveTo(shooter.x, shooter.y)
          context.lineTo(tailX, tailY)
          context.stroke()
        }

        if (shooter.life >= shooter.maxLife) shooter = null
      }

      context.globalAlpha = 1
      frame = window.requestAnimationFrame(render)
    }

    resize()

    if (reduceMotion) {
      // One still frame — the sky is present but nothing moves.
      for (const star of stars) {
        drawStar(star, 0.3 + star.depth * 0.4, 0)
      }
      context.globalAlpha = 1
      const onResizeStatic = () => {
        resize()
        for (const star of stars) drawStar(star, 0.3 + star.depth * 0.4, 0)
      }
      window.addEventListener('resize', onResizeStatic)
      return () => window.removeEventListener('resize', onResizeStatic)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        window.cancelAnimationFrame(frame)
      } else if (!running) {
        running = true
        frame = window.requestAnimationFrame(render)
      }
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    frame = window.requestAnimationFrame(render)

    return () => {
      running = false
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  )
}
