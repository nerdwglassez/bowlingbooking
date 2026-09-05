'use client'

import {
  CalendarMonthViewEvent,
  type EventViewColor,
} from '@/components/application/calendar/base-components/calendar-month-view-event'
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
  onSelectBooking: (bookingId: string) => void
  onSelectBlock?: (blockId: string) => void
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

function bookingColor(status: StaffBookingRow['status']): EventViewColor {
  if (status === 'CONFIRMED') return 'brand'
  if (status === 'NO_SHOW') return 'orange'
  if (status === 'COMPLETED') return 'gray'
  return 'blue'
}

export function ScheduleDayDetail({
  dateISO,
  bookings,
  blocks,
  canManageBlocks,
  onSelectBooking,
  onSelectBlock,
}: ScheduleDayDetailProps) {
  const slots = sortSlots(bookings, blocks)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-primary">
        {formatDayDetailTitle(dateISO)}
      </h2>

      {slots.length === 0 ? (
        <p className="text-xs font-semibold text-quaternary">
          Nothing scheduled for this day.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {slots.map((slot) =>
            slot.kind === 'booking' ? (
              <li key={slot.booking.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectBooking(slot.booking.id)}
                >
                  <CalendarMonthViewEvent
                    label={slot.booking.customerName}
                    supportingText={formatSlotTime(slot.booking.startTime)}
                    color={bookingColor(slot.booking.status)}
                  />
                </button>
              </li>
            ) : (
              <li key={slot.block.id}>
                {canManageBlocks && onSelectBlock ? (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => onSelectBlock(slot.block.id)}
                  >
                    <CalendarMonthViewEvent
                      label={slot.block.reason ?? 'Lane block'}
                      supportingText={formatSlotTime(slot.block.startTime)}
                      color="gray"
                    />
                  </button>
                ) : (
                  <CalendarMonthViewEvent
                    label={slot.block.reason ?? 'Lane block'}
                    supportingText={
                      formatLanePill(slot.block.lanes) +
                      ' · ' +
                      formatSlotTime(slot.block.startTime)
                    }
                    color="gray"
                  />
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
