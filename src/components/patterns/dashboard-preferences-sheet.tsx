'use client'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Button } from '@/components/ui/button'
import { signOutAction } from '@/app/signin/actions'

export function DashboardPreferencesSheet({
  open,
  onClose,
  displayName,
}: {
  open: boolean
  onClose: () => void
  displayName: string
}) {
  return (
    <BottomSheet open={open} title="Preferences" onClose={onClose}>
      <div className="flex flex-col gap-4 p-4 text-sm">
        <p className="text-[var(--color-text-secondary)]">
          Signed in as{' '}
          <span className="font-medium text-[var(--color-text-primary)]">
            {displayName}
          </span>
        </p>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-sunken)] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Notifications
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Email reminders for upcoming bookings — coming soon.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" fullWidth>
            Sign out
          </Button>
        </form>
      </div>
    </BottomSheet>
  )
}

export function profileInitials(name: string | null, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}
