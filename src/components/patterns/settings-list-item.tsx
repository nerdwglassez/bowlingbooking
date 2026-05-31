import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

export interface SettingsListItemProps {
  href?: string
  icon: LucideIcon
  label: string
  sub?: string
  viewOnly?: boolean
  variant?: 'default' | 'danger'
  onClick?: () => void
}

export function SettingsListItem({
  href,
  icon: Icon,
  label,
  sub,
  viewOnly,
  variant = 'default',
  onClick,
}: SettingsListItemProps) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
            variant === 'danger'
              ? 'bg-[color-mix(in_srgb,var(--status-error-text)_8%,transparent)]'
              : 'bg-[var(--surface-sunken)]'
          }`}
        >
          <Icon
            className={`size-4 ${
              variant === 'danger'
                ? 'text-[var(--status-error-text)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              variant === 'danger'
                ? 'text-[var(--status-error-text)]'
                : 'text-[var(--color-text-primary)]'
            }`}
          >
            {label}
          </p>
          {sub ? (
            <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
              {sub}
            </p>
          ) : null}
        </div>
      </div>
      {variant !== 'danger' ? (
        <ChevronRight
          className="size-3.5 shrink-0 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      ) : null}
    </>
  )

  const className = `flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-solid px-3.5 py-3 transition-colors ${
    variant === 'danger'
      ? 'border-[color-mix(in_srgb,var(--status-error-text)_15%,transparent)] bg-[var(--surface-elevated)]'
      : 'border-[var(--color-border)] bg-[var(--surface-elevated)] hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)]'
  } ${viewOnly ? 'opacity-60' : ''}`

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
      {content}
    </button>
  )
}
