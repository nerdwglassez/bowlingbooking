'use client'

import { SearchLg } from '@untitledui/icons'

import { Input } from '@/components/base/input/input'
import { cx } from '@/lib/cx'

export type CockpitSearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CockpitSearchBar({
  value,
  onChange,
  placeholder = 'Search by name, phone, or code…',
  className,
}: CockpitSearchBarProps) {
  return (
    <Input
      icon={SearchLg}
      size="sm"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label="Search bookings"
      className={cx('w-full', className)}
    />
  )
}
