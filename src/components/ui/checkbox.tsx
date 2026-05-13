import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

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
        className={cn(
          'inline-flex cursor-pointer items-center gap-2',
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'peer sr-only',
            'disabled:pointer-events-none',
            'aria-disabled:pointer-events-none',
          )}
          {...inputProps}
          disabled={disabled}
          aria-disabled={disabled ? true : undefined}
        />
        <span
          className={cn(
            'relative inline-flex size-5 shrink-0 items-center justify-center',
            'rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]',
            'bg-[var(--surface-card)]',
            'peer-checked:border-[var(--color-action)] peer-checked:bg-[var(--color-action)]',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-35',
            '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2',
            'peer-focus-visible:ring-[var(--color-border-strong)] peer-focus-visible:ring-offset-2',
            'peer-focus-visible:ring-offset-[var(--surface-ground)]',
          )}
          aria-hidden
        >
          <svg
            className="size-3 text-[var(--color-text-on-action)] transition-opacity"
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
          <span className="text-sm [font-family:var(--font-body)] text-[var(--color-text-primary)]">
            {label}
          </span>
        ) : null}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
