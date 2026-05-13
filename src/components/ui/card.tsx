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

export type CardVariant = 'default' | 'elevated' | 'flat'

export type CardVariantsArgs = {
  variant?: CardVariant
  className?: string
}

const variantClassName: Record<CardVariant, string> = {
  default: 'shadow-[var(--shadow-md)]',
  elevated: 'shadow-[var(--shadow-lg)]',
  flat: '',
}

export function cardVariants({
  variant = 'default',
  className,
}: CardVariantsArgs = {}): string {
  return cn(
    'bg-[var(--surface-card)] border border-[var(--color-border)]',
    'rounded-[var(--radius-xl)]',
    variantClassName[variant],
    className,
  )
}

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  CardVariantsArgs & {
    asChild?: boolean
  }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', asChild = false, ...props },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : 'div'
  return (
    <Comp
      ref={ref as never}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
})

Card.displayName = 'Card'

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1 p-6 pb-4', className)}
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
      <div
        ref={ref}
        className={cn('p-6 pt-0', className)}
        {...props}
      />
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
        className={cn('flex items-center gap-2 p-6 pt-0', className)}
        {...props}
      />
    )
  },
)

CardFooter.displayName = 'CardFooter'
