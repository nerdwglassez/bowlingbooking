'use client'

import type { ReactNode } from 'react'

import { SettingsNavGuard } from '@/components/chrome/settings-nav-guard'
import { SettingsFormProvider } from '@/lib/settings-form-context'

export function SettingsSectionProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsFormProvider>
      <SettingsNavGuard>{children}</SettingsNavGuard>
    </SettingsFormProvider>
  )
}
