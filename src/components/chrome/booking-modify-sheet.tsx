'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
            <p className="text-xs text-[var(--color-text-secondary)]">
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
              <p className="text-center text-xs text-[var(--color-text-secondary)]">
                Tap a field to change it
              </p>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-xs">
                <p className="mb-2 font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
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
              <p className="text-xs text-[var(--status-error-text)]">{error}</p>
            ) : null}

            <Button
              type="button"
              fullWidth
              loading={saving}
              disabled={changeCount < 1}
              onClick={handleSaveAll}
            >
              {changeCount === 1
                ? 'Save 1 change'
                : `Save ${changeCount} changes`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
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
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Start
              </span>
              <Input
                type="datetime-local"
                value={draftStartLocal}
                onChange={(e) => setDraftStartLocal(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                End
              </span>
              <Input
                type="datetime-local"
                value={draftEndLocal}
                onChange={(e) => setDraftEndLocal(e.target.value)}
              />
            </label>
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
                variant="ghost"
                onClick={() =>
                  setDraftBowlers((n) => Math.max(1, n - 1))
                }
              >
                −
              </Button>
              <span className="text-2xl font-medium tabular-nums">
                {draftBowlers}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setDraftBowlers((n) => Math.min(48, n + 1))
                }
              >
                +
              </Button>
            </div>
            <p className="text-center text-xs text-[var(--color-text-secondary)]">
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
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Package
              </span>
              <select
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                value={draftPackageId}
                onChange={(e) => setDraftPackageId(e.target.value)}
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
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
            <textarea
              rows={4}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Add a note about this booking…"
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
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
        'flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border p-3 text-left',
        changed
          ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]'
          : 'border-[var(--color-border)] bg-[var(--surface-elevated)]',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
          {label}
        </span>
        <span
          className={
            changed
              ? 'text-[var(--color-action)]'
              : 'text-[var(--color-text-primary)]'
          }
        >
          {value}
        </span>
      </div>
      <span className="shrink-0 text-[var(--color-action)]" aria-hidden>
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
      <button
        type="button"
        className="self-start text-xs text-[var(--color-action)]"
        onClick={onBack}
      >
        {backLabel}
      </button>
      {children}
      <Button type="button" fullWidth onClick={onApply}>
        {applyLabel}
      </Button>
    </div>
  )
}
