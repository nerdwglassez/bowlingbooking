'use client'

// ScheduleDayDetail — booking + block slots for one selected day.

import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { BlockedSlotRow, StaffBookingRow } from '@/lib/actions/staff'
import {
  formatDayDetailTitle,
  formatLanePill,
  formatSlotTime,
} from '@/lib/schedule-display'

export type ScheduleDayDetailProps = {
  dateISO: string
  bookings: StaffBookingRow[]
  blocks: BlockedSlotRow[]
  canManageBlocks: boolean
  onAddBlock: () => void
  onUnblock?: (blockId: string) => void
  unblockingId?: string | null
}

type DaySlot =
  | { kind: 'booking'; booking: StaffBookingRow }
  | { kind: 'block'; block: BlockedSlotRow }

function sortSlots(bookings: StaffBookingRow[], blocks: BlockedSlotRow[]): DaySlot[] {
  const items: DaySlot[] = [
    ...bookings.map((booking) => ({ kind: 'booking' as const, booking })),
    ...blocks.map((block) => ({ kind: 'block' as const, block })),
  ]
  return items.sort((a, b) => {
    const aTime =
      a.kind === 'booking' ? a.booking.startTime : a.block.startTime
    const bTime =
      b.kind === 'booking' ? b.booking.startTime : b.block.startTime
    return aTime.getTime() - bTime.getTime()
  })
}

function laneLabelForBooking(booking: StaffBookingRow): string {
  const count = booking.laneCount
  if (count <= 1) return 'Ln 1'
  return `Ln 1–${count}`
}

export function ScheduleDayDetail({
  dateISO,
  bookings,
  blocks,
  canManageBlocks,
  onAddBlock,
  onUnblock,
  unblockingId,
}: ScheduleDayDetailProps) {
  const slots = sortSlots(bookings, blocks)
  const activeLanes = bookings.filter((b) => b.status === 'CONFIRMED').length

  return (
    <section className="flex flex-col gap-3 border-t border-solid border-[var(--color-border)] pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base [font-family:var(--font-display)] text-[var(--color-text-primary)]">
            {formatDayDetailTitle(dateISO)}
          </h2>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
            {bookings.length} booking{bookings.length === 1 ? '' : 's'}
            {activeLanes > 0
              ? ` · ${activeLanes} lane group${activeLanes === 1 ? '' : 's'} active`
              : ''}
          </p>
        </div>
        {canManageBlocks ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-[11px] font-semibold text-[var(--color-action)]"
            onClick={onAddBlock}
          >
            <Plus className="size-3" aria-hidden />
            Block
          </Button>
        ) : null}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nothing scheduled for this day.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {slots.map((slot) =>
            slot.kind === 'booking' ? (
              <li key={slot.booking.id}>
                <Link
                  href={`/staff/bookings/${slot.booking.id}`}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <span className="min-w-[52px] text-[13px] [font-family:var(--font-display)] text-[var(--color-text-primary)]">
                    {formatSlotTime(slot.booking.startTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-[var(--color-text-primary)]">
                      {slot.booking.customerName}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--color-text-secondary)]">
                      {slot.booking.bowlerCount} bowler
                      {slot.booking.bowlerCount === 1 ? '' : 's'} ·{' '}
                      {slot.booking.packageName}
                    </span>
                  </span>
                  <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    {laneLabelForBooking(slot.booking)}
                  </span>
                </Link>
              </li>
            ) : (
              <li key={slot.block.id}>
                <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_20%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_5%,transparent)] px-3 py-2.5">
                  <span className="min-w-[52px] text-[13px] [font-family:var(--font-display)] text-[var(--color-text-primary)]">
                    {formatSlotTime(slot.block.startTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold text-[var(--status-error-text)]">
                      Blocked — {slot.block.reason ?? 'Lane block'}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--color-text-secondary)]">
                      {formatLanePill(slot.block.lanes)} ·{' '}
                      {formatSlotTime(slot.block.startTime)} –{' '}
                      {formatSlotTime(slot.block.endTime)}
                    </span>
                  </span>
                  <span className="rounded-[var(--radius-full)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-error-text)]">
                    {formatLanePill(slot.block.lanes)}
                  </span>
                  {canManageBlocks && onUnblock ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={unblockingId === slot.block.id}
                      onClick={() => onUnblock(slot.block.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
