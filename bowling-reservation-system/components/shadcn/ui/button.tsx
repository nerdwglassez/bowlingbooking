import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'bg-transparent text-gray-800 hover:bg-gray-100',
        outline: 'border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
      },
      size: {
        default: 'px-4 py-2 text-sm',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-6 py-2.5 text-base',
        icon: 'h-9 w-9 shrink-0 p-0',
      },
      rounded: {
        md: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, rounded }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
