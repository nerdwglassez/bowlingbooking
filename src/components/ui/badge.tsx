/**
 * Compatibility shim. New staff code should import from
 * `@/components/base/badges/badges`.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type BadgeVariant = 'default' | 'ok' | 'warning' | 'error' | 'info'

export type BadgeVariantsArgs = {
  variant?: BadgeVariant
  className?: string
}

const variantClassName: Record<BadgeVariant, string> = {
  default: 'bg-primary text-secondary ring-1 ring-primary ring-inset',
  ok: 'bg-success-primary text-success-primary ring-1 ring-success ring-inset',
  warning:
    'bg-warning-primary text-warning-primary ring-1 ring-warning ring-inset',
  error: 'bg-error-primary text-error-primary ring-1 ring-error ring-inset',
  info: 'bg-primary text-secondary ring-1 ring-brand ring-inset',
}

export function badgeVariants({
  variant = 'default',
  className,
}: BadgeVariantsArgs = {}): string {
  return cx(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
    'h-6 rounded-full px-2 text-xs font-medium',
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
    { className, variant = 'default', asChild = false, children, ...props },
    ref,
  ) {
    const classes = cx(badgeVariants({ variant }), className)

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>
      return React.cloneElement(child, {
        className: cx(classes, child.props.className),
        ...props,
      })
    }

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'
