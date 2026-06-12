import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'

export type PasswordInputProps = Omit<InputProps, 'type'>

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(props, ref) {
  return (
    <Input
      ref={ref}
      {...props}
      type="password"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
    />
  )
})

PasswordInput.displayName = 'PasswordInput'
