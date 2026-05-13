'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
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
  className?: string
}

export function PackageCard({
  pkg,
  selected,
  onSelect,
  className,
}: PackageCardProps) {
  return (
    <Card
      variant={selected ? 'elevated' : 'default'}
      className={cn(selected && 'border-[var(--color-action)]', className)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{pkg.name}</h3>
          {pkg.partyTypes.length > 0 ? (
            <Badge variant="default">
              {titleCase(pkg.partyTypes[0]!)}
            </Badge>
          ) : null}
        </div>
        {pkg.description ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {pkg.description}
          </p>
        ) : null}
      </CardHeader>
      <CardBody>
        <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
          {pkg.gameIncluded ? (
            <li>✓ Games included</li>
          ) : pkg.gameCostPer != null ? (
            <li>+ {formatPrice(pkg.gameCostPer)} per game</li>
          ) : null}
          {pkg.shoesIncluded ? (
            <li>✓ Shoe rental included</li>
          ) : pkg.shoeCostPer != null ? (
            <li>+ {formatPrice(pkg.shoeCostPer)} per pair</li>
          ) : null}
        </ul>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-text-secondary)]">From</div>
          <div className="text-2xl font-semibold">
            {formatPrice(pkg.basePrice)}
          </div>
        </div>
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
