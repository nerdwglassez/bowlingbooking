import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Placeholder block for loading states. Respects prefers-reduced-motion
 * via a static pulse-free fallback when motion is reduced.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] bg-[var(--color-border)]',
        'motion-safe:animate-pulse',
        className,
      )}
      aria-hidden
      {...props}
    />
  )
}
