'use client'

import { Eye, EyeOff } from '@untitledui/icons'
import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'
import { cx } from '@/lib/cx'

export type PasswordInputProps = InputProps

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput({ className, ...rest }, ref) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        {...rest}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={cx('pr-10', className)}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={cx(
          'absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center',
          'rounded-lg border-0 bg-transparent text-fg-quaternary',
          'hover:text-fg-quaternary_hover',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        )}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff className="size-4 shrink-0" aria-hidden />
        ) : (
          <Eye className="size-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  )
})

PasswordInput.displayName = 'PasswordInput'
