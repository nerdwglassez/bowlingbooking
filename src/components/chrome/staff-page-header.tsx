import type { ReactNode } from 'react'

export function StaffPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary" suppressHydrationWarning>
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-tertiary" suppressHydrationWarning>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  )
}
