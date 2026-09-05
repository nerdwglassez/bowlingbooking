/**
 * Compatibility surface card. Untitled has no 1:1 Card primitive — keep this
 * shim until a Figma rewrite replaces call sites.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type CardVariant = 'default' | 'elevated' | 'flat'

export type CardVariantsArgs = {
  variant?: CardVariant
  className?: string
}

const variantClassName: Record<CardVariant, string> = {
  default: 'shadow-md',
  elevated: 'shadow-lg',
  flat: 'shadow-none',
}

export function cardVariants({
  variant = 'default',
  className,
}: CardVariantsArgs = {}): string {
  return cx(
    'bg-primary ring-1 ring-secondary ring-inset rounded-xl',
    variantClassName[variant],
    className,
  )
}

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  CardVariantsArgs & {
    asChild?: boolean
  }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', asChild = false, children, ...props },
  ref,
) {
  const classes = cx(cardVariants({ variant }), className)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>
    return React.cloneElement(child, {
      className: cx(classes, child.props.className),
      ...props,
    })
  }

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  )
})

Card.displayName = 'Card'

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cx('flex flex-col gap-1 p-6 pb-4', className)}
        {...props}
      />
    )
  },
)

CardHeader.displayName = 'CardHeader'

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  function CardBody({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cx('p-6 pt-0', className)} {...props} />
    )
  },
)

CardBody.displayName = 'CardBody'

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cx('flex items-center gap-2 p-6 pt-0', className)}
        {...props}
      />
    )
  },
)

CardFooter.displayName = 'CardFooter'
