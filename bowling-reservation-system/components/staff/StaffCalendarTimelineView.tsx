'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { BookingStatusPill } from '@/components/shared/status/StatusPill'
import type { TimelineEntry, TimelineSlot, SchedulingConflict } from '@/lib/staff/scheduling'
import { formatTime12Hour } from '@/lib/time'

type StaffCalendarTimelineViewProps = {
  slots: TimelineSlot[]
  entries: TimelineEntry[]
  conflicts: SchedulingConflict[]
  onBookingOpen: (bookingId: string) => void
}

export default function StaffCalendarTimelineView({
  slots,
  entries,
  conflicts,
  onBookingOpen,
}: StaffCalendarTimelineViewProps) {
  const lanes = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.lane))).sort((a, b) => a - b),
    [entries]
  )

  const conflictBookingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const conflict of conflicts) {
      ids.add(conflict.firstBookingId)
      ids.add(conflict.secondBookingId)
    }
    return ids
  }, [conflicts])

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        Timeline is unavailable for the selected range.
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
        No bookings available to render in timeline view.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
      {conflicts.length > 0 ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {conflicts.length} schedule conflict{conflicts.length === 1 ? '' : 's'} detected in this
            view.
          </span>
        </div>
      ) : null}

      <div className="min-w-[720px]">
        <div
          className="grid gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500"
          style={{
            gridTemplateColumns: `90px repeat(${slots.length}, minmax(52px, 1fr))`,
          }}
        >
          <div>Lane</div>
          {slots.map((slot) => (
            <div key={slot.index} className="text-center">
              {formatTime12Hour(slot.startTime)}
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {lanes.map((lane) => {
            const laneEntries = entries.filter((entry) => entry.lane === lane)
            return (
              <div
                key={lane}
                className="grid min-h-[84px] items-stretch gap-2"
                style={{
                  gridTemplateColumns: `90px repeat(${slots.length}, minmax(52px, 1fr))`,
                }}
              >
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                  Lane {lane}
                </div>

                {slots.map((slot) => (
                  <div
                    key={`${lane}:${slot.index}`}
                    className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40"
                  />
                ))}

                {laneEntries.map((entry) => {
                  const isConflict = conflictBookingIds.has(entry.bookingId)
                  return (
                    <div
                      key={entry.key}
                      className="relative z-10 h-[84px]"
                      style={{
                        gridRow: 1,
                        gridColumn: `${entry.startSlotIndex + 2} / span ${entry.slotSpan}`,
                      }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onBookingOpen(entry.bookingId)}
                        className={`h-full w-full items-start justify-start rounded-xl border px-3 py-2 text-left hover:bg-indigo-50 ${
                          isConflict
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-indigo-200 bg-indigo-50/70'
                        }`}
                      >
                        <div className="w-full">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {entry.customerName}
                            </p>
                            <BookingStatusPill
                              status={entry.status}
                              context="staff"
                              className="text-[10px]"
                            />
                          </div>
                          <p className="truncate text-xs text-slate-600">{entry.packageName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatTime12Hour(entry.startTime)} - {formatTime12Hour(entry.endTime)}
                          </p>
                        </div>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
