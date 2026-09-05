import type { ReactNode } from 'react'

export interface SettingsSubpageHeaderProps {
  title: string
  subtitle?: string
}

export function SettingsSubpageHeader({
  title,
  subtitle,
}: SettingsSubpageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {subtitle ? (
        <p className="text-sm text-tertiary">{subtitle}</p>
      ) : null}
    </header>
  )
}

export function SettingsSectionLabel({
  children,
}: {
  children: ReactNode
}) {
  return (
    <h2 className="px-1 pt-2 text-sm font-semibold text-secondary">
      {children}
    </h2>
  )
}
