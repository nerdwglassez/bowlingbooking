'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { packageSummaryTags } from '@/lib/package-detail'
import { formatPrice } from '@/lib/pricing'
import type { Package, PartyType } from '@/types'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

function titleCase(name: PartyType): string {
  return name.charAt(0) + name.slice(1).toLowerCase()
}

export type PackageCardProps = {
  pkg: Package
  selected: boolean
  onSelect: (pkg: Package) => void
  /** Opens detail sheet (`booking-step2-refined.html` 2a / 2c). */
  onOpenDetails: (pkg: Package) => void
  className?: string
}

export function PackageCard({
  pkg,
  selected,
  onSelect,
  onOpenDetails,
  className,
}: PackageCardProps) {
  const tags = packageSummaryTags(pkg)

  return (
    <Card
      variant={selected ? 'elevated' : 'default'}
      className={cn(selected && 'border-[var(--color-action)]', className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {pkg.name}
          </h3>
          {pkg.partyTypes.length > 0 ? (
            <Badge variant="default">{titleCase(pkg.partyTypes[0]!)}</Badge>
          ) : null}
        </div>
        <div className="mt-1">
          <span className="text-xs text-[var(--color-text-muted)]">From </span>
          <span className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {formatPrice(pkg.basePrice)}
          </span>
        </div>
        {pkg.description ? (
          <p className="mt-2 line-clamp-3 text-sm text-[var(--color-text-secondary)]">
            {pkg.description}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-auto justify-start p-0 text-left text-[11px] font-semibold text-[var(--color-action)] hover:bg-transparent hover:text-[var(--color-action-hover)]"
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetails(pkg)
          }}
        >
          What&apos;s included →
        </Button>
        {tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="default" className="h-auto min-h-6 py-0.5">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardFooter className="flex items-center justify-end border-t border-[var(--color-border)] pt-4">
        <Button
          variant={selected ? 'secondary' : 'primary'}
          onClick={() => onSelect(pkg)}
          aria-pressed={selected}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </CardFooter>
    </Card>
  )
}
