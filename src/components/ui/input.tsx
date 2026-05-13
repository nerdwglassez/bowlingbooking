import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type InputVariant = 'default'
export type InputSize = 'sm' | 'md' | 'lg'

export type InputVariantsArgs = {
  variant?: InputVariant
  inputSize?: InputSize
  className?: string
}

const inputSizeClassName: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-[14px] text-sm',
  lg: 'h-12 px-5 text-sm font-semibold',
}

const variantClassName: Record<InputVariant, string> = {
  default: '',
}

export function inputVariants({
  variant = 'default',
  inputSize = 'md',
  className,
}: InputVariantsArgs = {}): string {
  return cn(
    'bg-[var(--surface-card)] border border-[var(--color-border)]',
    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
    'rounded-[var(--radius-md)] [font-family:var(--font-body)]',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)]',
    'aria-invalid:border-[var(--status-error-border)]',
    'aria-invalid:focus-visible:ring-[var(--status-error-text)]',
    'disabled:opacity-35 disabled:cursor-not-allowed',
    'aria-disabled:opacity-35 aria-disabled:cursor-not-allowed',
    inputSizeClassName[inputSize],
    variantClassName[variant],
    className,
  )
}

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> &
  InputVariantsArgs & {
    invalid?: boolean
  }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, variant = 'default', inputSize = 'md', invalid, ...rest },
    ref,
  ) {
    return (
      <input
        ref={ref}
        {...rest}
        className={cn(inputVariants({ variant, inputSize }), className)}
        aria-invalid={invalid === true ? true : rest['aria-invalid']}
      />
    )
  },
)

Input.displayName = 'Input'
