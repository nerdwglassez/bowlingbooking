'use client'

import type { ReactNode } from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type BookingSurfaceProps = {
  children: ReactNode
  className?: string
}

/**
 * Customer booking layout: full-bleed mobile column; md+ grows into a viewport-width panel.
 */
export function BookingSurface({ children, className }: BookingSurfaceProps) {
  return (
    <div className="min-h-dvh bg-[var(--surface-ground)] md:bg-[var(--surface-app-backdrop)] md:px-6 md:py-8 lg:px-8 lg:py-8">
      <div
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[var(--surface-ground)]',
          'md:min-h-[calc(100dvh-4rem)] md:max-w-xl md:rounded-[var(--radius-lg)] md:border md:border-[var(--color-border)] md:shadow-[var(--shadow-md)] md:overflow-hidden',
          'lg:min-h-[calc(100dvh-5rem)] lg:max-w-2xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
