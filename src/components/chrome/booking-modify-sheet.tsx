'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { TextArea } from '@/components/base/textarea/textarea'
import type { StaffBookingDetail, StaffPackageOption } from '@/lib/actions/staff'
import {
  getStaffPackageOptions,
  staffModifyBookingAction,
} from '@/lib/actions/staff'
import { getLaneCount } from '@/lib/lane-logic'
import { bookingDurationHours } from '@/lib/tenant-config'

type EditorField = 'datetime' | 'bowlers' | 'package' | 'notes' | null

type PendingChanges = {
  startTime?: Date
  endTime?: Date
  bowlerCount?: number
  packageId?: string
  packageName?: string
  notes?: string | null
}

function formatDateTimeLine(start: Date, end: Date): string {
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`
}

function formatDurationLine(start: Date, end: Date): string {
  const hours = bookingDurationHours(start, end)
  const endFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${hours.toFixed(1)} hr · ends ${endFmt.format(end)}`
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseDatetimeLocal(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function BookingModifySheet({
  open,
  booking,
  tenantId,
  bowlersPerLane = 6,
  onClose,
  onSaved,
}: {
  open: boolean
  booking: StaffBookingDetail | null
  tenantId: string
  bowlersPerLane?: number
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useStaffToast()
  const [editor, setEditor] = useState<EditorField>(null)
  const [changes, setChanges] = useState<PendingChanges>({})
  const [packages, setPackages] = useState<StaffPackageOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, startTransition] = useTransition()

  const [draftStartLocal, setDraftStartLocal] = useState('')
  const [draftEndLocal, setDraftEndLocal] = useState('')
  const [draftBowlers, setDraftBowlers] = useState(2)
  const [draftPackageId, setDraftPackageId] = useState('')
  const [draftNotes, setDraftNotes] = useState('')

  const sheetKey = booking ? `${booking.id}-${open}` : 'closed'

  useEffect(() => {
    if (!open || !booking) return
    queueMicrotask(() => {
      setEditor(null)
      setChanges({})
      setError(null)
      setDraftStartLocal(toDatetimeLocalValue(booking.startTime))
      setDraftEndLocal(toDatetimeLocalValue(booking.endTime))
      setDraftBowlers(booking.bowlerCount)
      setDraftPackageId('')
      setDraftNotes(booking.notes ?? '')
      void getStaffPackageOptions(tenantId)
        .then((rows) => {
          setPackages(rows)
          const match = rows.find((p) => p.name === booking.packageName)
          if (match) setDraftPackageId(match.id)
        })
        .catch(() => {
          setPackages([])
        })
    })
  }, [sheetKey, booking, tenantId, open])

  const effective = useMemo(() => {
    if (!booking) return null
    const startTime = changes.startTime ?? booking.startTime
    const endTime = changes.endTime ?? booking.endTime
    const bowlerCount = changes.bowlerCount ?? booking.bowlerCount
    return {
      startTime,
      endTime,
      bowlerCount,
      laneCount: getLaneCount(bowlerCount, bowlersPerLane),
      packageName: changes.packageName ?? booking.packageName,
      notes:
        changes.notes !== undefined ? changes.notes : booking.notes,
    }
  }, [booking, changes, bowlersPerLane])

  const changeCount = useMemo(() => {
    let n = 0
    if (changes.startTime != null || changes.endTime != null) n++
    if (changes.bowlerCount != null) n++
    if (changes.packageId != null) n++
    if (changes.notes !== undefined) n++
    return n
  }, [changes])

  if (!booking || !effective) return null

  const title =
    editor === 'datetime'
      ? 'Date & time'
      : editor === 'bowlers'
        ? 'Bowlers'
        : editor === 'package'
          ? 'Package'
          : editor === 'notes'
            ? 'Notes'
            : 'Modify booking'

  function handleSaveAll() {
    setError(null)
    startTransition(async () => {
      try {
        await staffModifyBookingAction({
          bookingId: booking!.id,
          ...(changes.startTime ? { startTime: changes.startTime } : {}),
          ...(changes.endTime ? { endTime: changes.endTime } : {}),
          ...(changes.bowlerCount != null
            ? { bowlerCount: changes.bowlerCount }
            : {}),
          ...(changes.packageId != null
            ? { packageId: changes.packageId }
            : {}),
          ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
        })
        showToast({
          message: `Booking updated · ${booking!.customerEmail}`,
          variant: 'success',
        })
        onSaved()
        onClose()
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Could not save changes.'
        setError(msg)
        showToast({ message: msg, variant: 'error' })
      }
    })
  }

  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={() => {
        setEditor(null)
        onClose()
      }}
    >
      <div className="flex flex-col gap-3 pb-2 text-sm">
        {editor == null ? (
          <>
            <p className="text-sm text-tertiary">
              {booking.customerName} · {booking.confirmationCode}
            </p>

            <FieldRow
              label="Date & time"
              value={formatDateTimeLine(
                effective.startTime,
                effective.endTime,
              )}
              changed={changes.startTime != null || changes.endTime != null}
              onClick={() => setEditor('datetime')}
            />
            <FieldRow
              label="Duration"
              value={formatDurationLine(
                effective.startTime,
                effective.endTime,
              )}
              changed={changes.startTime != null || changes.endTime != null}
              onClick={() => setEditor('datetime')}
            />
            <FieldRow
              label="Bowlers"
              value={`${effective.bowlerCount} bowlers · ${effective.laneCount} ${effective.laneCount === 1 ? 'lane' : 'lanes'}`}
              changed={changes.bowlerCount != null}
              onClick={() => setEditor('bowlers')}
            />
            <FieldRow
              label="Package"
              value={effective.packageName}
              changed={changes.packageId != null}
              onClick={() => setEditor('package')}
            />
            <FieldRow
              label="Notes"
              value={effective.notes?.trim() || 'No notes'}
              changed={changes.notes !== undefined}
              onClick={() => setEditor('notes')}
            />

            {changeCount === 0 ? (
              <p className="text-center text-sm text-tertiary">
                Tap a field to change it
              </p>
            ) : (
              <div className="rounded-xl bg-warning-primary p-3 text-sm ring-1 ring-warning ring-inset">
                <p className="mb-2 text-sm font-semibold text-secondary">
                  Changes
                </p>
                <ul className="flex flex-col gap-1">
                  {(changes.startTime != null || changes.endTime != null) && (
                    <li>Date & time → {formatDateTimeLine(effective.startTime, effective.endTime)}</li>
                  )}
                  {changes.bowlerCount != null && (
                    <li>Bowlers → {effective.bowlerCount}</li>
                  )}
                  {changes.packageId != null && (
                    <li>Package → {effective.packageName}</li>
                  )}
                  {changes.notes !== undefined && <li>Notes updated</li>}
                </ul>
              </div>
            )}

            {error ? (
              <p className="text-sm text-error-primary">{error}</p>
            ) : null}

            <Button
              type="button"
              color="primary"
              isLoading={saving}
              isDisabled={changeCount < 1}
              onClick={handleSaveAll}
            >
              {changeCount === 1
                ? 'Save 1 change'
                : `Save ${changeCount} changes`}
            </Button>
            <Button
              type="button"
              color="tertiary"
              onClick={() => {
                setChanges({})
                onClose()
              }}
            >
              Discard all changes
            </Button>
          </>
        ) : editor === 'datetime' ? (
          <EditorPanel
            backLabel="‹ Modify"
            onBack={() => setEditor(null)}
            applyLabel="Apply"
            onApply={() => {
              const start = parseDatetimeLocal(draftStartLocal)
              const end = parseDatetimeLocal(draftEndLocal)
              if (!start || !end || end <= start) {
                setError('Enter valid start and end times.')
                return
              }
              setChanges((p) => ({
                ...p,
                startTime: start,
                endTime: end,
              }))
              setError(null)
              setEditor(null)
            }}
          >
            <Input
              type="datetime-local"
              label="Start"
              value={draftStartLocal}
              onChange={setDraftStartLocal}
            />
            <Input
              type="datetime-local"
              label="End"
              value={draftEndLocal}
              onChange={setDraftEndLocal}
            />
          </EditorPanel>
        ) : editor === 'bowlers' ? (
          <EditorPanel
            backLabel="‹ Modify"
            onBack={() => setEditor(null)}
            applyLabel={`Apply — ${draftBowlers} bowlers`}
            onApply={() => {
              setChanges((p) => ({ ...p, bowlerCount: draftBowlers }))
              setEditor(null)
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                color="tertiary"
                onClick={() =>
                  setDraftBowlers((n) => Math.max(1, n - 1))
                }
              >
                −
              </Button>
              <span className="text-display-sm font-semibold tabular-nums text-primary">
                {draftBowlers}
              </span>
              <Button
                type="button"
                color="tertiary"
                onClick={() =>
                  setDraftBowlers((n) => Math.min(48, n + 1))
                }
              >
                +
              </Button>
            </div>
            <p className="text-center text-sm text-tertiary">
              {getLaneCount(draftBowlers, bowlersPerLane)}{' '}
              {getLaneCount(draftBowlers, bowlersPerLane) === 1
                ? 'lane'
                : 'lanes'}{' '}
              required
            </p>
          </EditorPanel>
        ) : editor === 'package' ? (
          <EditorPanel
            backLabel="‹ Modify"
            onBack={() => setEditor(null)}
            applyLabel="Apply package"
            onApply={() => {
              const pkg = packages.find((p) => p.id === draftPackageId)
              if (!pkg) {
                setError('Select a package.')
                return
              }
              setChanges((p) => ({
                ...p,
                packageId: pkg.id,
                packageName: pkg.name,
              }))
              setEditor(null)
            }}
          >
            <NativeSelect
              label="Package"
              value={draftPackageId}
              onChange={(e) => setDraftPackageId(e.target.value)}
              options={packages.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </EditorPanel>
        ) : (
          <EditorPanel
            backLabel="‹ Modify"
            onBack={() => setEditor(null)}
            applyLabel="Apply notes"
            onApply={() => {
              setChanges((p) => ({ ...p, notes: draftNotes }))
              setEditor(null)
            }}
          >
            <TextArea
              rows={4}
              label="Notes"
              value={draftNotes}
              onChange={setDraftNotes}
              placeholder="Add a note about this booking…"
            />
          </EditorPanel>
        )}
      </div>
    </BottomSheet>
  )
}

function FieldRow({
  label,
  value,
  changed,
  onClick,
}: {
  label: string
  value: string
  changed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl p-3 text-left ring-1 ring-inset',
        changed
          ? 'bg-warning-primary ring-warning'
          : 'bg-primary ring-secondary',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-tertiary">{label}</span>
        <span
          className={changed ? 'text-brand-secondary' : 'text-primary'}
        >
          {value}
        </span>
      </div>
      <span className="shrink-0 text-brand-secondary" aria-hidden>
        ›
      </span>
    </button>
  )
}

function EditorPanel({
  children,
  backLabel,
  onBack,
  applyLabel,
  onApply,
}: {
  children: React.ReactNode
  backLabel: string
  onBack: () => void
  applyLabel: string
  onApply: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button type="button" color="link-color" size="sm" onClick={onBack}>
        {backLabel}
      </Button>
      {children}
      <Button type="button" color="primary" onClick={onApply}>
        {applyLabel}
      </Button>
    </div>
  )
}
