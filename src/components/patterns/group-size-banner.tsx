'use client'

export type LargeGroupWarningProps = {
  className?: string
}

/** Wireframe 1c — amber heads-up for groups over 18 (no code input on step 1). */
export function LargeGroupWarning({ className }: LargeGroupWarningProps) {
  return (
    <div
      className={[
        'mt-2.5 rounded-[var(--radius-md)] border border-[var(--status-warning-border)]',
        'bg-[var(--status-warning-bg)] px-[13px] py-[11px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <p className="text-xs font-semibold text-[var(--status-warning-text)]">
        ⚠ Large group booking
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--color-action-dark)]">
        Groups over 18 need a group code or eligible package to complete
        booking. You can continue selecting your date and time — we&apos;ll ask
        for the code at the package step.
      </p>
    </div>
  )
}

export type GroupSizeBannerProps = {
  phone: string
  className?: string
}

/** Shown at max online bowler count when phone booking is required. */
export function GroupSizeBanner({ phone, className }: GroupSizeBannerProps) {
  const telHref = `tel:${phone.replace(/\D/g, '')}`

  return (
    <div
      className={[
        'mt-2.5 rounded-[var(--radius-md)] border border-[var(--status-warning-border)]',
        'bg-[var(--status-warning-bg)] px-[13px] py-[11px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <p className="text-xs font-semibold text-[var(--status-warning-text)]">
        Maximum online group size
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--color-action-dark)]">
        Online booking supports up to 18 bowlers. For larger groups, call us at{' '}
        <a
          href={telHref}
          className="font-semibold underline underline-offset-2"
        >
          {phone}
        </a>
        .
      </p>
    </div>
  )
}
