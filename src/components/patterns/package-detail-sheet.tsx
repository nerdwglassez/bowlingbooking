'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { packageInclusionLines } from '@/lib/package-detail'
import { formatPrice } from '@/lib/pricing'
import type { Package } from '@/types'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type PackageDetailSheetProps = {
  pkg: Package | null
  open: boolean
  onClose: () => void
  onSelectThisPackage: (pkg: Package) => void
  className?: string
}

/**
 * Wireframe `booking-step2-refined.html` variant **2c** — bottom sheet with full
 * description, "What's included" list, and primary **Select this package**.
 */
export function PackageDetailSheet({
  pkg,
  open,
  onClose,
  onSelectThisPackage,
  className,
}: PackageDetailSheetProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || pkg == null) {
    return null
  }

  const lines = packageInclusionLines(pkg)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col justify-end p-0 sm:p-4',
        className,
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--surface-overlay)]"
        aria-label="Close package details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
        className="relative mx-auto w-full max-w-md rounded-t-[var(--radius-xl)] border border-[var(--color-border)] border-b-0 bg-[var(--surface-card)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-xl)] sm:border-b"
      >
        <div
          className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--color-border-strong)]"
          aria-hidden
        />
        <h2
          id="package-detail-title"
          className="text-xl font-semibold text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {pkg.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          <span className="text-xs text-[var(--color-text-muted)]">From </span>
          <span className="text-lg font-semibold text-[var(--color-text-primary)]">
            {formatPrice(pkg.basePrice)}
          </span>
        </p>
        {pkg.description ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {pkg.description}
          </p>
        ) : null}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          What&apos;s included
        </p>
        <ul className="mt-2 space-y-2">
          {lines.map((line, i) => (
            <li
              key={`${pkg.id}-inc-${i}`}
              className="flex gap-2 text-sm text-[var(--color-text-secondary)]"
            >
              <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden>
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => onSelectThisPackage(pkg)}
          >
            Select this package
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
