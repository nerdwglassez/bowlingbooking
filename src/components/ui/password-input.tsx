import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type PasswordInputProps = Omit<
  InputProps,
  'autoCapitalize' | 'autoCorrect' | 'spellCheck' | 'type'
>

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput({ className, ...rest }, ref) {
  return (
    <Input
      ref={ref}
      {...rest}
      type="password"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      className={cn(className)}
    />
  )
})

PasswordInput.displayName = 'PasswordInput'
