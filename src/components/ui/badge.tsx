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

export type BadgeVariant = 'default' | 'ok' | 'warning' | 'error' | 'info'

export type BadgeVariantsArgs = {
  variant?: BadgeVariant
  className?: string
}

const variantClassName: Record<BadgeVariant, string> = {
  default: cn(
    'border border-solid border-[var(--color-border)]',
    'bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]',
  ),
  ok: cn(
    'border border-solid border-[var(--status-ok-border)]',
    'bg-[var(--status-ok-bg)] text-[var(--status-ok-text)]',
  ),
  warning: cn(
    'border border-solid border-[var(--status-warning-border)]',
    'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
  ),
  error: cn(
    'border border-solid border-[var(--status-error-border)]',
    'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
  ),
  info: cn(
    'border border-solid border-[var(--status-info-border)]',
    'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
  ),
}

export function badgeVariants({
  variant = 'default',
  className,
}: BadgeVariantsArgs = {}): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
    'h-6 rounded-full px-2 text-xs [font-family:var(--font-body)]',
    variantClassName[variant],
    className,
  )
}

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  BadgeVariantsArgs & {
    asChild?: boolean
  }

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    { className, variant = 'default', asChild = false, ...props },
    ref,
  ) {
    const Comp: React.ElementType = asChild ? Slot : 'span'
    return (
      <Comp
        ref={ref as never}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    )
  },
)

Badge.displayName = 'Badge'
