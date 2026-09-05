import type { ReactNode } from 'react'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'

export function SettingsSubpageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsSubpageHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  )
}
