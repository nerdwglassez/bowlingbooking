import type { ReactNode } from 'react'

export function SettingsFieldRow({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-secondary py-5 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex shrink-0 flex-col gap-0.5 lg:w-80">
        <p className="text-sm font-semibold text-secondary">
          {label}
          {required ? (
            <span className="text-brand-secondary" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </p>
        {hint ? <p className="text-sm text-tertiary">{hint}</p> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
