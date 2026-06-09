'use client'

import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type PasswordFieldProps = Omit<InputProps, 'type'> & {
  visible: boolean
  onToggleVisible: () => void
}

/** Password input with show/hide toggle — visibility controlled by parent. */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(function PasswordField(
  { className, visible, onToggleVisible, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <Input
        ref={ref}
        {...rest}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={cn(
          'absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center',
          'rounded-[var(--radius-md)] border-0 bg-transparent',
          'text-[var(--color-text-muted)] transition-colors',
          'hover:text-[var(--color-text-secondary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)]',
        )}
        onClick={onToggleVisible}
      >
        {visible ? (
          <EyeOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <Eye className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  )
})

PasswordField.displayName = 'PasswordField'
