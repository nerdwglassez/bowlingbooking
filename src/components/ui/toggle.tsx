/**
 * Compatibility shim. New staff code should import from
 * `@/components/base/toggle/toggle`.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type ToggleProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: React.ReactNode
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  function Toggle(
    { className, label, disabled, role = 'switch', ...inputProps },
    ref,
  ) {
    return (
      <label
        className={cx(
          'inline-flex shrink-0 cursor-pointer items-center gap-2',
          'has-[:disabled]:cursor-not-allowed',
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          role={role}
          disabled={disabled}
          aria-disabled={disabled ? true : undefined}
          className={cx(
            'peer sr-only',
            'disabled:pointer-events-none',
            'aria-disabled:pointer-events-none',
          )}
          {...inputProps}
        />
        <span
          className={cx(
            'relative h-6 w-11 shrink-0 rounded-full',
            'bg-tertiary transition-colors duration-150',
            'peer-checked:bg-brand-solid',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'peer-checked:[&>span]:translate-x-5',
          )}
          aria-hidden
        >
          <span
            className={cx(
              'pointer-events-none absolute left-0.5 top-0.5 size-5 translate-x-0 rounded-full',
              'bg-white shadow-sm transition-transform duration-150',
            )}
          />
        </span>
        {label != null && label !== false ? (
          <span className="min-w-0 text-sm text-secondary">{label}</span>
        ) : null}
      </label>
    )
  },
)

Toggle.displayName = 'Toggle'
