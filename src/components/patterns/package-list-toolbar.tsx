'use client'

import { Button } from '@/components/base/buttons/button'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type PackageListToolbarProps = {
  resultCount: number
  className?: string
}

/**
 * Wireframe `booking-step2-refined.html` — results count + sort/filter entry
 * (sheet interaction deferred).
 */
export function PackageListToolbar({
  resultCount,
  className,
}: PackageListToolbarProps) {
  const label =
    resultCount === 1 ? '1 package available' : `${resultCount} packages available`

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-secondary pb-3',
        className,
      )}
    >
      <p className="text-sm text-tertiary">{label}</p>
      <Button
        type="button"
        color="secondary"
        size="sm"
        isDisabled
        aria-label="Sort and filter coming soon"
      >
        {'⇅ Sort & Filter'}
      </Button>
    </div>
  )
}
