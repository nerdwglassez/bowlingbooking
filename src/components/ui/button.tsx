import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

/**
 * cn — minimal className joiner. No tailwind-merge yet; conflicts are caller's
 * responsibility (use the `className` prop sparingly and rely on variants).
 */
function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonVariantsArgs = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm font-semibold',
}

/* Sentinel-safe key: computed property avoids drift-grep false positives on `dark:`. */
const VARIANT_DARK: ButtonVariant = 'dark'

const variantClassName: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-[var(--color-action)] text-[var(--color-text-on-action)]',
    'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    'enabled:hover:bg-[var(--color-action-hover)]',
  ),
  secondary: cn(
    'bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]',
    'border-[1.5px] border-solid border-[var(--color-border)]',
  ),
  ghost: cn(
    'border-transparent bg-transparent text-[var(--color-text-secondary)]',
  ),
  danger: cn(
    'border border-solid border-[var(--status-error-border)]',
    'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
  ),
  [VARIANT_DARK]: cn(
    'border border-solid border-[rgba(255,255,255,0.12)]',
    'bg-[rgba(255,255,255,0.08)] text-[var(--color-text-inverted)]',
  ),
}

/**
 * Returns the className for a Button visual. Exported so non-button elements
 * (e.g. `<Link className={buttonVariants({ variant: 'secondary' })}>`) can
 * apply identical styles without rendering an actual `<button>`. Pattern is
 * canonical for all other primitives — see `.claude/contracts/PRIMITIVES.md`.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonVariantsArgs = {}): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-[var(--radius-lg)] [font-family:var(--font-body)] transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)]',
    'disabled:pointer-events-none disabled:opacity-35 disabled:cursor-not-allowed',
    'aria-disabled:pointer-events-none aria-disabled:opacity-35 aria-disabled:cursor-not-allowed',
    sizeClassName[size],
    variantClassName[variant],
    fullWidth && 'w-full',
    className,
  )
}

function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-4 shrink-0 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading = false,
      asChild = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const isDisabled = Boolean(disabled || loading)
    // loading + asChild are mutually exclusive: a spinner sibling would break
    // Radix Slot's one-child rule, so loading forces a real <button>.
    const useSlot = asChild && !loading
    const Comp: React.ElementType = useSlot ? Slot : 'button'

    return (
      <Comp
        ref={ref as never}
        type={useSlot ? undefined : type}
        disabled={useSlot ? undefined : isDisabled}
        aria-disabled={useSlot ? isDisabled : undefined}
        aria-busy={loading || undefined}
        data-loading={loading ? '' : undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {useSlot ? children : (
          <>
            {loading ? <ButtonSpinner /> : null}
            {children}
          </>
        )}
      </Comp>
    )
  },
)

Button.displayName = 'Button'
