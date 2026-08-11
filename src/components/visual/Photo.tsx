'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

/**
 * A photograph that arrives rather than appears.
 *
 * Without this, images snap in at full opacity the instant they decode, which
 * on a dark editorial page reads as flickering — the reported "images don't
 * populate well". The wrapper holds a dim ground, then cross-fades the picture
 * in over it and lets it settle from a very slight scale.
 *
 * `onLoad` fires for cached images too, so a repeat visit does not sit blank.
 */
export function Photo({
  className = '',
  wrapperClassName = '',
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    /*
      No `aria-hidden` here — that would hide the image's alt text — and no
      `pointer-events-none`, which would stop clicks reaching the link that
      wraps most of these photographs.
    */
    <span
      className={`absolute inset-0 block overflow-hidden bg-ash ${wrapperClassName}`}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 block transition-opacity duration-700',
          loaded ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
        style={{
          background:
            'linear-gradient(120deg, #14141a 30%, #1e1e26 50%, #14141a 70%)',
        }}
      />
      <Image
        {...props}
        onLoad={() => setLoaded(true)}
        className={[
          className,
          'transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          loaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
        ].join(' ')}
      />
    </span>
  )
}
