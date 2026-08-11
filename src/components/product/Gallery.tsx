'use client'

import Image from 'next/image'
import { useState } from 'react'

export function Gallery({
  images,
  name,
}: {
  images: { url: string; alt: string }[]
  name: string
}) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  if (!current) {
    return <div className="aspect-[4/5] w-full bg-ash" aria-hidden="true" />
  }

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-ash">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt}
          fill
          priority
          quality={88}
          sizes="(max-width: 1023px) 100vw, 52vw"
          className="cinematic object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-3" role="group" aria-label={`${name} images`}>
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === active}
              className={[
                'relative aspect-square w-20 overflow-hidden bg-ash transition-all duration-500',
                index === active
                  ? 'opacity-100 ring-1 ring-gild'
                  : 'opacity-55 hover:opacity-85',
              ].join(' ')}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
