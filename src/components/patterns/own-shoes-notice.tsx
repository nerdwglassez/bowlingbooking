'use client'

import { Info } from 'lucide-react'

export type OwnShoesNoticeProps = {
  className?: string
}

export function OwnShoesNotice({ className }: OwnShoesNoticeProps) {
  return (
    <div
      className={[
        'flex gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-info-border)]',
        'bg-[var(--status-info-bg)] px-3 py-2.5 text-sm leading-snug text-[var(--status-info-text)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Shoes worn on the lanes must meet bowling shoe requirements to prevent
        lane damage. If your shoes do not qualify, you will be required to rent
        shoes at the center.
      </p>
    </div>
  )
}
