'use client'

import { useState, type ReactNode } from 'react'
import { User } from 'lucide-react'

import { DashboardPreferencesSheet } from '@/components/patterns/dashboard-preferences-sheet'

export function DashboardPageChrome({
  venueName,
  address,
  userName,
  userEmail,
  children,
}: {
  venueName: string
  address: string
  userName: string | null
  userEmail: string
  children: ReactNode
}) {
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <>
      <header className="-mx-4 -mt-6 mb-2 flex items-center justify-between gap-3 bg-[var(--surface-dark)] px-4 py-4 lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-base [font-family:var(--font-display)] text-[var(--color-text-inverted)]">
            {venueName}
          </h2>
          <a
            href={mapsHref}
            className="text-[11px] text-[var(--color-action-dark)] underline-offset-2 hover:underline"
          >
            {address}
          </a>
        </div>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-full)] border-[1.5px] border-[var(--color-border-on-dark)] bg-[var(--surface-dark)]"
          aria-label="Open preferences"
          onClick={() => setPreferencesOpen(true)}
        >
          <User
            className="size-[18px] text-[var(--color-chrome-link)]"
            strokeWidth={1.5}
            aria-hidden
          />
        </button>
      </header>
      {children}
      <DashboardPreferencesSheet
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        displayName={userName?.trim() || userEmail}
      />
    </>
  )
}
