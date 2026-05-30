'use client'

export type ShoesIncludedNoticeProps = {
  packageName: string
  className?: string
}

export function ShoesIncludedNotice({
  packageName,
  className,
}: ShoesIncludedNoticeProps) {
  return (
    <div
      className={[
        'flex items-center gap-2.5 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)]',
        'bg-[var(--surface-sunken)] px-[13px] py-[11px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--color-border-strong)] text-[13px]"
        aria-hidden
      >
        👟
      </span>
      <p className="text-xs leading-snug text-[var(--color-text-secondary)]">
        <strong className="font-semibold text-[var(--color-text-primary)]">
          Shoes are included
        </strong>{' '}
        with your {packageName} package — no rental fees for your group.
      </p>
    </div>
  )
}
