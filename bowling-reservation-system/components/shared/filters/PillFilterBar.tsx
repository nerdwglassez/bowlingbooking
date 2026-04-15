'use client'

import { cn } from '@/lib/utils'

export type PillFilterOption<T extends string> = {
  value: T
  label: string
}

type PillFilterBarProps<T extends string> = {
  value: T
  options: readonly PillFilterOption<T>[]
  onChange: (value: T) => void
  className?: string
  buttonClassName?: string
  activeClassName?: string
  inactiveClassName?: string
}

export default function PillFilterBar<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  activeClassName = 'bg-blue-600 text-white',
  inactiveClassName = 'bg-white text-gray-700 hover:bg-gray-50',
}: PillFilterBarProps<T>) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              isActive ? activeClassName : inactiveClassName,
              buttonClassName
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { PillFilterBar }

