'use client'

import { packageCardTags } from '@/lib/package-addons'
import { getPackageCardPrice } from '@/lib/package-detail'
import { formatPrice } from '@/lib/pricing'
import type { Package } from '@/types'

import { PackageCardTag } from '@/components/patterns/package-addon-section'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type PackageCardProps = {
  pkg: Package
  selected: boolean
  onSelect: (pkg: Package) => void
  onOpenDetails: (pkg: Package) => void
  className?: string
}

/**
 * Wireframe `booking-step2-refined.html` — tappable card, radio ring, 2-line
 * description, **What's included →**, neutral pills on load; locked pill when selected.
 */
export function PackageCard({
  pkg,
  selected,
  onSelect,
  onOpenDetails,
  className,
}: PackageCardProps) {
  const { amountCents, clarifier } = getPackageCardPrice(pkg)
  const { neutral, locked } = packageCardTags(pkg)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(pkg)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(pkg)
        }
      }}
      className={cn(
        'cursor-pointer rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)]',
        'bg-[var(--surface-card)] p-[14px] transition-[border-color,background-color,box-shadow]',
        selected &&
          'border-[var(--color-action)] bg-[var(--color-action-subtle)] shadow-[0_0_0_3px_var(--color-action-tint)]',
        className,
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3
          className="flex-1 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {pkg.name}
        </h3>
        <span
          className={cn(
            'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected
              ? 'border-[var(--color-action)] bg-[var(--color-action)]'
              : 'border-[var(--color-border-strong)] bg-transparent',
          )}
          aria-hidden
        >
          {selected ? (
            <span className="size-2 rounded-full bg-[var(--color-text-on-action)]" />
          ) : null}
        </span>
      </div>

      <p className="mb-1.5">
        <span
          className="text-base font-semibold text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatPrice(amountCents)}
        </span>{' '}
        <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
          {clarifier}
        </span>
      </p>

      {pkg.description ? (
        <p className="mb-2 line-clamp-2 text-[11px] leading-[1.55] text-[var(--color-text-secondary)]">
          {pkg.description}
        </p>
      ) : null}

      <button
        type="button"
        className="block border-0 bg-transparent p-0 text-[11px] font-semibold text-[var(--color-action)]"
        onClick={(e) => {
          e.stopPropagation()
          onOpenDetails(pkg)
        }}
      >
        What&apos;s included →
      </button>

      {neutral.length > 0 || locked.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {neutral.map((tag) => (
            <PackageCardTag key={tag} label={tag} />
          ))}
          {locked.map((tag) => (
            <PackageCardTag key={tag} label={tag} locked={selected} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
