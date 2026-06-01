'use client'

import { useState, useTransition } from 'react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StaffBookingDetail } from '@/lib/actions/staff'
import { staffUpdateBookingNotesAction } from '@/lib/actions/staff'

type ModifyView = 'overview' | 'notes'

export function BookingModifySheet({
  open,
  booking,
  onClose,
  onSaved,
}: {
  open: boolean
  booking: StaffBookingDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const [view, setView] = useState<ModifyView>('overview')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!booking) return null

  const title =
    view === 'overview' ? 'Modify booking' : 'Edit notes'

  function handleSaveNotes() {
    setError(null)
    startTransition(async () => {
      try {
        await staffUpdateBookingNotesAction(booking!.id, notes)
        onSaved()
        setView('overview')
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save notes.')
      }
    })
  }

  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={() => {
        setView('overview')
        onClose()
      }}
    >
      <div className="flex flex-col gap-3 p-4 text-sm">
        {view === 'overview' ? (
          <>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {booking.customerName} · {booking.confirmationCode}
            </p>
            <button
              type="button"
              onClick={() => {
                setNotes(booking.notes ?? '')
                setView('notes')
              }}
              className="flex w-full flex-col gap-1 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-3 text-left"
            >
              <span className="text-xs text-[var(--color-text-secondary)]">
                Notes
              </span>
              <span className="text-[var(--color-text-primary)]">
                {booking.notes?.trim() || 'Add internal notes…'}
              </span>
            </button>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Date, time, and bowler changes require a future staff modification
              release.
            </p>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Internal notes
              </span>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error ? (
              <p className="text-xs text-[var(--status-error-text)]">{error}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('overview')}
              >
                Back
              </Button>
              <Button
                type="button"
                fullWidth
                loading={pending}
                onClick={handleSaveNotes}
              >
                Save notes
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
