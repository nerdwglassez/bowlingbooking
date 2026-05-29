'use client'

export type GroupSizeBannerProps = {
  phone: string
  className?: string
}

export function GroupSizeBanner({ phone, className }: GroupSizeBannerProps) {
  const telHref = `tel:${phone.replace(/\D/g, '')}`

  return (
    <div
      className={[
        'rounded-[var(--radius-md)] border border-[var(--status-info-border)]',
        'bg-[var(--status-info-bg)] px-3 py-2.5 text-sm text-[var(--status-info-text)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      For groups larger than 18, call us at{' '}
      <a
        href={telHref}
        className="font-semibold underline underline-offset-2"
      >
        {phone}
      </a>
    </div>
  )
}
