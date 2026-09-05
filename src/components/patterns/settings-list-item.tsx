import type { FC, SVGProps } from 'react'
import Link from 'next/link'
import { ChevronRight } from '@untitledui/icons'

export interface SettingsListItemProps {
  href?: string
  icon: FC<SVGProps<SVGSVGElement>>
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
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
            variant === 'danger' ? 'bg-error-secondary' : 'bg-secondary'
          }`}
        >
          <Icon
            className={`size-4 ${
              variant === 'danger' ? 'text-error-primary' : 'text-fg-quaternary'
            }`}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              variant === 'danger' ? 'text-error-primary' : 'text-primary'
            }`}
          >
            {label}
          </p>
          {sub ? (
            <p className="mt-0.5 text-xs text-tertiary">{sub}</p>
          ) : null}
        </div>
      </div>
      {variant !== 'danger' ? (
        <ChevronRight
          className="size-3.5 shrink-0 text-fg-quaternary"
          aria-hidden
        />
      ) : null}
    </>
  )

  const className = `flex items-center justify-between gap-3 rounded-xl border border-solid px-3.5 py-3 transition-colors ${
    variant === 'danger'
      ? 'border-error_subtle bg-error-secondary'
      : 'border-secondary bg-primary hover:bg-secondary'
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
