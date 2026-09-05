import * as React from 'react'

import { cx } from '@/lib/cx'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/** Untitled-styled loading placeholder. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cx(
        'rounded-md bg-quaternary',
        'motion-safe:animate-pulse',
        className,
      )}
      aria-hidden
      {...props}
    />
  )
}
