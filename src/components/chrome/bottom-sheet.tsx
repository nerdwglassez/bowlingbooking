'use client'

// BottomSheet — staff slide-up panel (matches PackageDetailSheet chrome).
//
// Mobile: slides up from bottom with dimmed backdrop.
// Desktop: 400px right panel (schedule wireframe) — same opaque surface + overlay.

import { useEffect } from 'react'
import { X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type BottomSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-end md:justify-stretch">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--surface-overlay)] sheet-backdrop-in"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        className={cn(
          'relative flex max-h-[min(88dvh,720px)] w-full flex-col',
          'border-[var(--color-border)] bg-[var(--surface-raised)]',
          'px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[var(--shadow-xl)]',
          'max-md:sheet-slide-up border-t',
          'md:h-full md:max-h-none md:w-[400px] md:border-l md:border-t-0',
        )}
      >
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'absolute right-2 top-2 z-10 size-9 p-0',
          )}
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-5 shrink-0" aria-hidden />
        </button>

        <div
          className="mx-auto mb-3.5 h-[3px] w-8 shrink-0 rounded-full bg-[var(--color-border-strong)] md:hidden"
          aria-hidden
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-6">
          <h2
            id="bottom-sheet-title"
            className="text-lg [font-family:var(--font-display)] text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  )
}
