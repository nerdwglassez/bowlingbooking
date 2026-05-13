import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type SelectVariant = 'default'
export type SelectSize = 'sm' | 'md' | 'lg'

export type SelectVariantsArgs = {
  variant?: SelectVariant
  selectSize?: SelectSize
  className?: string
}

const sizeClassName: Record<SelectSize, string> = {
  sm: 'h-8 min-h-8 py-1.5 pl-3 pr-8 text-[13px]',
  md: 'h-10 min-h-10 py-2 pl-3.5 pr-9 text-sm',
  lg: 'h-12 min-h-12 py-2.5 pl-4 pr-10 text-sm font-semibold',
}

const variantClassName: Record<SelectVariant, string> = {
  default: cn(
    'bg-[var(--surface-card)] text-[var(--color-text-primary)]',
    'border-[1.5px] border-solid border-[var(--color-border)]',
  ),
}

const chevronInsetClassName: Record<SelectSize, string> = {
  sm: 'right-2',
  md: 'right-3',
  lg: 'right-3.5',
}

export function selectVariants({
  variant = 'default',
  selectSize = 'md',
  className,
}: SelectVariantsArgs = {}): string {
  return cn(
    'block w-full max-w-full appearance-none rounded-[var(--radius-md)]',
    '[font-family:var(--font-body)] transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)]',
    'focus-visible:border-[var(--color-action)]',
    'disabled:pointer-events-none disabled:opacity-35 disabled:cursor-not-allowed',
    'aria-disabled:pointer-events-none aria-disabled:opacity-35 aria-disabled:cursor-not-allowed',
    'aria-invalid:border-[var(--status-error-border)] aria-invalid:bg-[var(--status-error-bg)]',
    sizeClassName[selectSize],
    variantClassName[variant],
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
      className={cn('size-4 shrink-0', className)}
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
      variant = 'default',
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
          className={cn(selectVariants({ variant, selectSize }), className)}
          {...props}
        >
          {children}
        </select>
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]',
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
