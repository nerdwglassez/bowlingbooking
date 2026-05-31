'use client'

import { LogOut } from 'lucide-react'

import { signOutAction } from '@/app/signin/actions'
import { SettingsListItem } from '@/components/patterns/settings-list-item'

export function SettingsSignOutItem({ venueName }: { venueName: string }) {
  function handleSignOut() {
    const confirmed = window.confirm(`Sign out of ${venueName} Staff?`)
    if (!confirmed) return
    void signOutAction()
  }

  return (
    <SettingsListItem
      icon={LogOut}
      label="Sign out"
      variant="danger"
      onClick={handleSignOut}
    />
  )
}
