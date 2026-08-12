'use client'

import Image from 'next/image'
import { useCallback, useId, useRef, useState } from 'react'
import { PortalButton } from '@/components/portal/ui'

export type UploadedImage = { url: string; alt: string }

/**
 * Drag-and-drop image manager for a product.
 *
 * Files can be dropped anywhere on the panel, pasted, or chosen through the
 * file dialog — the hidden input is kept so the control stays reachable by
 * keyboard, since a drop zone alone is not operable without a pointer.
 *
 * Order matters: the first image is the one used on the product card, which is
 * stated in the UI rather than left to be discovered.
 */
export function ImageUploader({
  value,
  onChange,
}: {
  value: UploadedImage[]
  onChange: (next: UploadedImage[]) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (list.length === 0) {
        setError('Those files are not images.')
        return
      }

      setBusy(true)
      setError(null)
      try {
        const body = new FormData()
        for (const file of list) body.append('files', file)

        const response = await fetch('/api/portal/upload', { method: 'POST', body })
        const payload = (await response.json()) as {
          files?: { url: string; name: string }[]
          error?: string
        }

        if (!response.ok || !payload.files) {
          setError(payload.error ?? 'That upload did not work.')
          return
        }

        onChange([
          ...value,
          ...payload.files.map((f) => ({
            url: f.url,
            // A sensible starting point; the owner can refine it below.
            alt: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(),
          })),
        ])
      } catch {
        setError('We could not reach the server. Check your connection.')
      } finally {
        setBusy(false)
      }
    },
    [onChange, value],
  )

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onChange(next)
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (draggingIndex === null) setDragging(true)
        }}
        onDragLeave={(e) => {
          // Ignore drags crossing onto a child element.
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (draggingIndex !== null) return
          if (e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files)
        }}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files)
          if (files.length > 0) void upload(files)
        }}
        className={[
          'flex flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-gild-deep bg-gild/10'
            : 'border-rule bg-parchment hover:border-ink/30',
        ].join(' ')}
      >
        <span className="text-[22px]" aria-hidden="true">
          {busy ? '◌' : '☾'}
        </span>
        <p className="mt-3 text-[14.5px] text-ink">
          {busy ? 'Uploading…' : 'Drag photographs here'}
        </p>
        <p className="mt-1.5 text-[12.5px] text-ink-soft">
          or{' '}
          <label
            htmlFor={inputId}
            className="cursor-pointer underline decoration-ink-soft/50 underline-offset-2 hover:text-ink"
          >
            choose files
          </label>{' '}
          · JPEG, PNG, WebP or AVIF · up to 8 MB each
        </p>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files)
            // Allow re-selecting the same file after a removal.
            e.target.value = ''
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      {/* Uploaded images */}
      {value.length > 0 ? (
        <>
          <p className="mt-6 text-[12.5px] text-ink-soft">
            {value.length} image{value.length === 1 ? '' : 's'}. The first is used on
            the product card — drag to reorder.
          </p>

          <ul className="mt-3 flex flex-col gap-3">
            {value.map((image, index) => (
              <li
                key={`${image.url}-${index}`}
                draggable
                onDragStart={() => setDraggingIndex(index)}
                onDragEnd={() => setDraggingIndex(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (draggingIndex !== null) move(draggingIndex, index)
                  setDraggingIndex(null)
                }}
                className={[
                  'flex items-start gap-4 border border-rule bg-surface p-3 transition-opacity',
                  draggingIndex === index ? 'opacity-40' : 'opacity-100',
                ].join(' ')}
              >
                <span
                  className="mt-1 cursor-grab select-none px-1 text-[15px] leading-none text-ink-soft active:cursor-grabbing"
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  ⠿
                </span>

                <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-parchment">
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    {index === 0 ? (
                      <span className="rounded-[2px] border border-gild-deep/40 bg-gild/12 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.14em] text-gild-deep">
                        Card image
                      </span>
                    ) : null}
                    <span className="truncate font-mono text-[11px] text-ink-soft">
                      {image.url}
                    </span>
                  </span>

                  <label className="mt-2 block">
                    <span className="sr-only">Describe image {index + 1}</span>
                    <input
                      value={image.alt}
                      onChange={(e) =>
                        onChange(
                          value.map((img, i) =>
                            i === index ? { ...img, alt: e.target.value } : img,
                          ),
                        )
                      }
                      placeholder="Describe it, for screen readers and search"
                      className="h-9 w-full border border-rule bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-soft/55 focus:border-gild-deep focus:outline-none"
                    />
                  </label>
                </span>

                <span className="flex shrink-0 flex-col gap-1">
                  <MoveButton
                    label={`Move image ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </MoveButton>
                  <MoveButton
                    label={`Move image ${index + 1} down`}
                    disabled={index === value.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </MoveButton>
                </span>

                <PortalButton
                  type="button"
                  tone="ghost"
                  size="sm"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  Remove
                </PortalButton>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

/** Keyboard-accessible reordering, since dragging is pointer-only. */
function MoveButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center border border-rule text-[12px] text-ink-soft transition-colors hover:border-ink/35 hover:text-ink disabled:opacity-30 disabled:hover:border-rule"
    >
      {children}
    </button>
  )
}
