'use client'

import * as React from 'react'
import type { ButtonProps as AriaButtonProps } from 'react-aria-components'
import { Button as AriaButton } from 'react-aria-components'

import {
  styles as untitledButtonStyles,
  type ButtonProps as UntitledButtonProps,
} from '@/components/base/buttons/button'
import { cx } from '@/lib/cx'

/**
 * Compatibility shim over Untitled `base/buttons/button`.
 * New staff code should import Untitled Button directly.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantToColor: Record<
  ButtonVariant,
  NonNullable<UntitledButtonProps['color']>
> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'tertiary',
  danger: 'primary-destructive',
  dark: 'secondary',
}

export type ButtonVariantsArgs = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonVariantsArgs = {}): string {
  const color = variantToColor[variant]
  return cx(
    untitledButtonStyles.common.root,
    untitledButtonStyles.sizes[size].root,
    untitledButtonStyles.colors[color].root,
    fullWidth && 'w-full',
    className,
  )
}

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> & {
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
      onClick,
      ...props
    },
    ref,
  ) {
    const isDisabled = Boolean(disabled || loading)
    const classes = cx(buttonVariants({ variant, size, fullWidth }), className)

    if (asChild && !loading && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string
      }>
      return React.cloneElement(child, {
        className: cx(classes, child.props.className),
      } as never)
    }

    return (
      <AriaButton
        ref={ref as never}
        type={type}
        isDisabled={isDisabled}
        isPending={loading}
        className={classes}
        onPress={
          onClick
            ? (e) => {
                onClick(
                  e as unknown as React.MouseEvent<HTMLButtonElement>,
                )
              }
            : undefined
        }
        {...(props as AriaButtonProps)}
      >
        {children}
      </AriaButton>
    )
  },
)

Button.displayName = 'Button'
