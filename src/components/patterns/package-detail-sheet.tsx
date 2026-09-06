'use client'

import { useEffect } from 'react'
import {
  Armchair,
  Beer,
  Check,
  Footprints,
  Gamepad2,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  getPackageCardPrice,
  packageInclusionItems,
} from '@/lib/package-detail'
import type { PackageInclusionIcon } from '@/lib/package-addons'
import { formatPrice } from '@/lib/pricing'
import type { Package } from '@/types'

const INCLUSION_ICONS: Record<PackageInclusionIcon, LucideIcon> = {
  lanes: Gamepad2,
  shoes: Footprints,
  food: UtensilsCrossed,
  drink: Beer,
  seating: Armchair,
  default: Check,
}

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
 * Wireframe `booking-step2-refined.html` variant **2c** — slides up from the
 * bottom on mobile with dimmed backdrop, full description, and icon inclusion rows.
 */
export function PackageDetailSheet({
  pkg,
  open,
  onClose,
  onSelectThisPackage,
  className,
}: PackageDetailSheetProps) {
  useEffect(() => {
    if (!open || pkg == null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, pkg])

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

  const { amountCents, clarifier } = getPackageCardPrice(pkg)
  const inclusions = packageInclusionItems(pkg)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center lg:p-4',
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-[var(--surface-overlay)] sheet-backdrop-in',
        )}
        aria-label="Close package details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
        className={cn(
          'relative mx-auto flex max-h-[min(88dvh,720px)] w-full max-w-md flex-col',
          'border-[var(--color-border)] bg-[var(--surface-raised)]',
          'px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[var(--shadow-xl)]',
          'max-lg:sheet-slide-up border-t lg:max-w-lg lg:rounded-[var(--radius-xl)] lg:border',
        )}
      >
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'absolute right-2 top-2 z-10 size-11 p-0',
          )}
          onClick={onClose}
          aria-label="Close package details"
        >
          <X className="size-5 shrink-0" aria-hidden />
        </button>

        <div
          className="mx-auto mb-3.5 h-[3px] w-8 shrink-0 rounded-full bg-[var(--color-border-strong)] lg:hidden"
          aria-hidden
        />

        <div className="min-h-0 flex-1 overflow-y-auto pr-6">
          <h2
            id="package-detail-title"
            className="text-[20px] font-semibold leading-tight text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pkg.name}
          </h2>

          <p className="mt-1 mb-3">
            <span
              className="text-lg font-semibold text-[var(--color-text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatPrice(amountCents)}
            </span>{' '}
            <span className="text-xs text-[var(--color-text-muted)]">
              {clarifier}
            </span>
          </p>

          {pkg.description ? (
            <p className="mb-3.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
              {pkg.description}
            </p>
          ) : null}

          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            What&apos;s included
          </p>

          <ul className="mb-3.5">
            {inclusions.map((item, i) => {
              const Icon = INCLUSION_ICONS[item.icon]
              return (
                <li
                  key={`${pkg.id}-inc-${i}`}
                  className={cn(
                    'flex items-center gap-2 py-2 text-xs text-[var(--color-text-primary)]',
                    i < inclusions.length - 1 &&
                      'border-b border-[var(--color-border-subtle)]',
                  )}
                >
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]"
                    aria-hidden
                  >
                    <Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  <span>{item.text}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <Button
          variant="primary"
          fullWidth
          className="shrink-0"
          onClick={() => onSelectThisPackage(pkg)}
        >
          Select this package
        </Button>
      </div>
    </div>
  )
}
