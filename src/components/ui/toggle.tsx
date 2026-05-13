import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type ToggleProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: React.ReactNode
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  function Toggle({ className, label, disabled, role = 'switch', ...inputProps }, ref) {
    return (
      <label
        className={cn(
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
          className={cn(
            'peer sr-only',
            'disabled:pointer-events-none',
            'aria-disabled:pointer-events-none',
          )}
          {...inputProps}
        />
        <span
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full',
            'bg-[var(--surface-sunken)] transition-colors duration-150',
            'peer-checked:bg-[var(--color-action)]',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2',
            'peer-focus-visible:ring-[var(--color-border-strong)] peer-focus-visible:ring-offset-2',
            'peer-focus-visible:ring-offset-[var(--surface-ground)]',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-35',
            'peer-checked:[&>span]:translate-x-5',
          )}
          aria-hidden
        >
          <span
            className={cn(
              'pointer-events-none absolute left-0.5 top-0.5 size-5 translate-x-0 rounded-full',
              'bg-[var(--surface-card)] shadow-[var(--shadow-sm)]',
              'transition-transform duration-150',
            )}
          />
        </span>
        {label != null && label !== false ? (
          <span className="min-w-0 text-sm [font-family:var(--font-body)] text-[var(--color-text-primary)]">
            {label}
          </span>
        ) : null}
      </label>
    )
  },
)

Toggle.displayName = 'Toggle'
