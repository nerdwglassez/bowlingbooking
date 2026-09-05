'use client'

import { useState } from 'react'
import { LogOut01 } from '@untitledui/icons'

import { SettingsListItem } from '@/components/patterns/settings-list-item'
import { SignOutConfirmSheet } from '@/components/chrome/sign-out-confirm-sheet'

export function SettingsSignOutItem({ venueName }: { venueName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <SettingsListItem
        icon={LogOut01}
        label="Sign out"
        variant="danger"
        onClick={() => setOpen(true)}
      />
      <SignOutConfirmSheet
        venueName={venueName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
