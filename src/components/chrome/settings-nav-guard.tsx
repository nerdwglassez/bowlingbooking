'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { SettingsUnsavedDialog } from '@/components/patterns/settings-unsaved-dialog'
import { useSettingsFormContext } from '@/lib/settings-form-context'

export function SettingsNavGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { dirty, saving, requestSave } = useSettingsFormContext()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  function requestNavigate(href: string) {
    if (!dirty) {
      router.push(href)
      return
    }
    setPendingHref(href)
    setDialogOpen(true)
  }

  return (
    <>
      <div
        data-settings-nav-guard
        onClickCapture={(e) => {
          const target = e.target as HTMLElement
          const anchor = target.closest('a[href]') as HTMLAnchorElement | null
          if (!anchor || !dirty) return
          const href = anchor.getAttribute('href')
          if (!href?.startsWith('/staff/settings')) return
          const path =
            href.startsWith('http') || typeof window === 'undefined'
              ? href
              : new URL(href, window.location.origin).pathname
          if (
            typeof window !== 'undefined' &&
            path === window.location.pathname
          ) {
            return
          }
          e.preventDefault()
          e.stopPropagation()
          requestNavigate(href)
        }}
      >
        {children}
      </div>
      <SettingsUnsavedDialog
        open={dialogOpen}
        saving={saving}
        onSave={() => {
          requestSave()
          setDialogOpen(false)
        }}
        onDiscard={() => {
          setDialogOpen(false)
          if (pendingHref) router.push(pendingHref)
        }}
        onKeepEditing={() => {
          setDialogOpen(false)
          setPendingHref(null)
        }}
      />
    </>
  )
}
