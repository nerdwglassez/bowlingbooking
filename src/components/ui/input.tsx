/**
 * Compatibility shim. New staff code should import from
 * `@/components/base/input/input`. Native-attribute call sites stay here.
 */

import * as React from 'react'

import { cx } from '@/lib/cx'

export type InputVariant = 'default'
export type InputSize = 'sm' | 'md' | 'lg'

export type InputVariantsArgs = {
  variant?: InputVariant
  inputSize?: InputSize
  className?: string
}

const inputSizeClassName: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-2.5 text-md',
  lg: 'px-4 py-3 text-md',
}

export function inputVariants({
  inputSize = 'md',
  className,
}: InputVariantsArgs = {}): string {
  return cx(
    'w-full bg-primary text-primary shadow-xs ring-1 ring-primary ring-inset',
    'rounded-lg placeholder:text-placeholder',
    'outline-brand transition duration-100 ease-linear',
    'focus:ring-2 focus:ring-brand focus:outline-hidden',
    'disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:text-disabled',
    'aria-invalid:ring-error_subtle aria-invalid:focus:ring-error',
    inputSizeClassName[inputSize],
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
    { className, variant: _variant = 'default', inputSize = 'md', invalid, ...rest },
    ref,
  ) {
    return (
      <input
        ref={ref}
        {...rest}
        className={cx(inputVariants({ inputSize }), className)}
        aria-invalid={invalid === true ? true : rest['aria-invalid']}
      />
    )
  },
)

Input.displayName = 'Input'
