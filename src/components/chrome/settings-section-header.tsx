'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { SignOutConfirmSheet } from '@/components/chrome/sign-out-confirm-sheet'
import { SettingsSectionNav } from '@/components/patterns/settings-section-nav'
import { useSettingsFormContext } from '@/lib/settings-form-context'
import {
  matchSettingsSectionHref,
  type SettingsSectionItem,
} from '@/lib/staff-nav'

export function SettingsSectionHeader({
  sections,
  venueName,
}: {
  sections: SettingsSectionItem[]
  venueName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { dirty, requestNavigate } = useSettingsFormContext()
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [showMobileSelect, setShowMobileSelect] = useState(false)
  const selectedHref = matchSettingsSectionHref(pathname, sections)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    function sync() {
      setShowMobileSelect(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  function onSelect(href: string) {
    requestNavigate(href)
    if (!dirty) router.push(href)
  }

  return (
    <header className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-primary">Settings</h1>
      <SettingsSectionNav
        sections={sections}
        selectedHref={selectedHref}
        onSelect={onSelect}
        onSignOut={() => setSignOutOpen(true)}
        showMobileSelect={showMobileSelect}
      />
      <SignOutConfirmSheet
        venueName={venueName}
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
      />
    </header>
  )
}
