import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Button as BaseButton } from '@/components/shadcn/ui/button'

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
    const variantMap = {
      primary: 'default',
      secondary: 'secondary',
      danger: 'destructive',
      ghost: 'ghost',
      outline: 'outline',
    } as const

    const sizeMap = {
      sm: 'sm',
      md: 'default',
      lg: 'lg',
      icon: 'icon',
    } as const

    return (
      <BaseButton
        ref={ref}
        type={type}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        rounded={rounded}
        isLoading={isLoading}
        className={className}
        disabled={disabled}
        {...props}
      >
        {children}
      </BaseButton>
    )
  }
)

Button.displayName = 'Button'

export default Button
