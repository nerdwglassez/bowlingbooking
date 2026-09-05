/**
 * Compatibility shim. New staff code should import from
 * `@/components/base/checkbox/checkbox`.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, disabled, ...inputProps }, ref) {
    return (
      <label
        className={cx(
          'inline-flex cursor-pointer items-center gap-2',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className={cx(
            'peer sr-only',
            'disabled:pointer-events-none',
            'aria-disabled:pointer-events-none',
          )}
          {...inputProps}
          disabled={disabled}
          aria-disabled={disabled ? true : undefined}
        />
        <span
          className={cx(
            'relative inline-flex size-5 shrink-0 items-center justify-center',
            'rounded-md bg-primary ring-1 ring-primary ring-inset',
            'peer-checked:bg-brand-solid peer-checked:ring-transparent',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
          )}
          aria-hidden
        >
          <svg
            className="size-3 text-white transition-opacity"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {label != null ? (
          <span className="text-sm text-secondary">{label}</span>
        ) : null}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
