/**
 * Compatibility shim. New staff code should import from
 * `@/components/base/select/select-native` or `select`.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type SelectVariant = 'default'
export type SelectSize = 'sm' | 'md' | 'lg'

export type SelectVariantsArgs = {
  variant?: SelectVariant
  selectSize?: SelectSize
  className?: string
}

const sizeClassName: Record<SelectSize, string> = {
  sm: 'h-9 py-1.5 pl-3 pr-8 text-sm',
  md: 'h-10 py-2 pl-3.5 pr-9 text-md',
  lg: 'h-11 py-2.5 pl-4 pr-10 text-md',
}

const chevronInsetClassName: Record<SelectSize, string> = {
  sm: 'right-2',
  md: 'right-3',
  lg: 'right-3.5',
}

export function selectVariants({
  selectSize = 'md',
  className,
}: SelectVariantsArgs = {}): string {
  return cx(
    'block w-full max-w-full appearance-none rounded-lg',
    'bg-primary text-primary shadow-xs ring-1 ring-primary ring-inset',
    'outline-brand transition duration-100 ease-linear',
    'focus:ring-2 focus:ring-brand focus:outline-hidden',
    'disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:text-disabled',
    'aria-invalid:ring-error_subtle',
    sizeClassName[selectSize],
    className,
  )
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: SelectVariant
  selectSize?: SelectSize
}

function SelectChevron({ className }: { className?: string }) {
  return (
    <svg
      className={cx('size-4 shrink-0', className)}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      variant: _variant = 'default',
      selectSize = 'md',
      disabled,
      'aria-invalid': ariaInvalid,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <span className="relative block w-full max-w-full">
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cx(selectVariants({ selectSize }), className)}
          {...props}
        >
          {children}
        </select>
        <span
          className={cx(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-quaternary',
            chevronInsetClassName[selectSize],
          )}
          aria-hidden
        >
          <SelectChevron />
        </span>
      </span>
    )
  },
)

Select.displayName = 'Select'
