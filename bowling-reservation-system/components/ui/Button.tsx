import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  /** Default `md` matches original padding; use `sm` for menus and dense UI, `lg` for emphasis. */
  size?: 'sm' | 'md' | 'lg' | 'icon'
  /** `md` = rounded-lg; `xl` = rounded-xl; `full` = pill. */
  rounded?: 'md' | 'xl' | 'full'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      rounded = 'md',
      isLoading,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const roundedStyles = {
      md: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-base',
      icon: 'h-9 w-9 shrink-0 p-0',
    }

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'bg-transparent text-gray-800 hover:bg-gray-100',
      outline: 'border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
    }

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseStyles,
          roundedStyles[rounded],
          size !== 'icon' ? sizeStyles[size] : sizeStyles.icon,
          variants[variant],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
