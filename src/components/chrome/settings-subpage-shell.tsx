'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { SettingsUnsavedDialog } from '@/components/patterns/settings-unsaved-dialog'
import { useSettingsFormContext } from '@/lib/settings-form-context'

export function SettingsSubpageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const router = useRouter()
  const { dirty, saving, requestSave } = useSettingsFormContext()
  const [dialogOpen, setDialogOpen] = useState(false)

  function requestLeave() {
    if (!dirty) {
      router.push('/staff/settings')
      return
    }
    setDialogOpen(true)
  }

  return (
    <>
      <SettingsSubpageHeader
        title={title}
        subtitle={subtitle}
        onBackRequest={dirty ? requestLeave : undefined}
        backHref="/staff/settings"
      />
      {children}
      <SettingsUnsavedDialog
        open={dialogOpen}
        saving={saving}
        onSave={() => {
          requestSave()
          setDialogOpen(false)
        }}
        onDiscard={() => {
          setDialogOpen(false)
          router.push('/staff/settings')
        }}
        onKeepEditing={() => setDialogOpen(false)}
      />
    </>
  )
}
