'use client'

import {
  Armchair,
  Beer,
  Check,
  Footprints,
  Gamepad2,
  Lock,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

import {
  formatOptionalAddonPrice,
  getPackageIncludedAddons,
  getPackageOptionalAddons,
  type PackageIncludedAddon,
  type PackageInclusionIcon,
  type PackageOptionalAddon,
} from '@/lib/package-addons'
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

export type PackageAddonSectionProps = {
  pkg: Package
  selectedOptionalAddonIds: string[]
  onToggleOptionalAddon: (addonId: string) => void
  className?: string
}

/**
 * Wireframe `booking-step2-refined.html` variant **2d** — included (locked)
 * rows and optional checkbox add-ons below the package list.
 */
export function PackageAddonSection({
  pkg,
  selectedOptionalAddonIds,
  onToggleOptionalAddon,
  className,
}: PackageAddonSectionProps) {
  const included = getPackageIncludedAddons(pkg)
  const optional = getPackageOptionalAddons(pkg)

  if (included.length === 0 && optional.length === 0) {
    return null
  }

  return (
    <section
      className={cn(
        'mt-1 border-t border-[var(--color-border)] pt-4',
        className,
      )}
    >
      {included.length > 0 ? (
        <>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
            Included with your package
          </p>
          <ul className="mb-3 flex flex-col gap-1.5">
            {included.map((item) => (
              <IncludedAddonRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      ) : null}

      {optional.length > 0 ? (
        <>
          <p className="mb-2 mt-3.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
            Add-ons (optional)
          </p>
          <ul className="flex flex-col gap-1.5">
            {optional.map((addon) => (
              <OptionalAddonCard
                key={addon.id}
                addon={addon}
                selected={selectedOptionalAddonIds.includes(addon.id)}
                onToggle={() => onToggleOptionalAddon(addon.id)}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function IncludedAddonRow({ item }: { item: PackageIncludedAddon }) {
  const Icon = INCLUSION_ICONS[item.icon]

  return (
    <li className="flex items-center gap-2.5 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-sunken)] px-3 py-2.5">
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
        aria-hidden
      >
        <Icon className="size-3" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
          {item.name}
        </p>
        {item.subtitle ? (
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
            {item.subtitle}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
        Included
      </span>
    </li>
  )
}

function OptionalAddonCard({
  addon,
  selected,
  onToggle,
}: {
  addon: PackageOptionalAddon
  selected: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)]',
          'bg-[var(--surface-card)] px-3 py-2.5 text-left transition-colors',
          selected &&
            'border-[var(--color-action)] bg-[var(--color-action-subtle)]',
        )}
      >
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-[5px] border-2 border-[var(--color-border-strong)]',
            selected &&
              'border-[var(--color-action)] bg-[var(--color-action)] text-[var(--color-text-on-action)]',
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-[var(--color-text-primary)]">
            {addon.name}
          </span>
          <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">
            {addon.description}
          </span>
        </span>
        <span
          className="shrink-0 text-[13px] font-semibold text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatOptionalAddonPrice(addon)}
        </span>
      </button>
    </li>
  )
}

export type PackageCardTagProps = {
  label: string
  locked?: boolean
}

/** Neutral or locked pill on package cards (wireframe `pkg-tag` / `pkg-included-tag`). */
export function PackageCardTag({ label, locked = false }: PackageCardTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
        locked
          ? 'border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]'
          : 'border-[var(--color-border)] bg-[var(--surface-ground)] text-[var(--color-text-secondary)]',
      )}
    >
      {locked ? <Lock className="size-2.5 shrink-0" aria-hidden /> : null}
      {label}
    </span>
  )
}
