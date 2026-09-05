'use client'

import { Calendar, Clock, Copy01, Users01 } from '@untitledui/icons'

import { Badge } from '@/components/base/badges/badges'
import { ButtonUtility } from '@/components/base/buttons/button-utility'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import type { StaffBookingRow } from '@/lib/actions/staff'
import { getLaneCount } from '@/lib/lane-logic'
import {
  formatDayDetailTitle,
  formatSlotTime,
} from '@/lib/schedule-display'

export type ScheduleReservationDetailProps = {
  booking: StaffBookingRow
}

function statusColor(
  status: StaffBookingRow['status'],
): 'gray' | 'success' | 'error' | 'warning' {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CANCELLED') return 'error'
  if (status === 'NO_SHOW') return 'warning'
  return 'gray'
}

function statusLabel(booking: StaffBookingRow): string {
  if (booking.isRefunded) return 'Refunded'
  return booking.status.replaceAll('_', ' ')
}

function IconRow({
  icon: Icon,
  text,
}: {
  icon: typeof Calendar
  text: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-fg-quaternary" />
      <p className="min-w-0 truncate text-sm text-tertiary">{text}</p>
    </div>
  )
}

export function ScheduleReservationDetail({
  booking,
}: ScheduleReservationDetailProps) {
  const { showToast } = useStaffToast()
  const dateISO = `${booking.startTime.getFullYear()}-${String(booking.startTime.getMonth() + 1).padStart(2, '0')}-${String(booking.startTime.getDate()).padStart(2, '0')}`
  const laneCount =
    booking.laneCount > 0
      ? booking.laneCount
      : getLaneCount(booking.bowlerCount)

  async function copyConfirmation() {
    try {
      await navigator.clipboard.writeText(booking.confirmationCode)
      showToast({ message: 'Confirmation copied', variant: 'success' })
    } catch {
      showToast({ message: 'Could not copy confirmation', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="-mt-2 flex justify-end gap-0.5">
        <ButtonUtility
          size="xs"
          color="tertiary"
          tooltip="Copy confirmation"
          icon={Copy01}
          onClick={() => void copyConfirmation()}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <IconRow icon={Calendar} text={formatDayDetailTitle(dateISO)} />
        <IconRow
          icon={Clock}
          text={`${formatSlotTime(booking.startTime)} – ${formatSlotTime(booking.endTime)}`}
        />
        <IconRow
          icon={Users01}
          text={
            booking.bowlerCount === 1
              ? '1 bowler'
              : `${booking.bowlerCount} bowlers`
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-primary">
          {booking.bowlerCount === 1
            ? '1 bowler'
            : `${booking.bowlerCount} bowlers`}
        </p>
        <span className="h-3 border-l border-primary" />
        <p className="text-sm text-tertiary">
          {laneCount === 1 ? '1 lane' : `${laneCount} lanes`}
        </p>
        <span className="h-3 border-l border-primary" />
        <p className="text-sm text-tertiary">{booking.packageName}</p>
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">Reservation</p>
        <div className="flex flex-col gap-2 text-sm text-tertiary">
          <div className="flex items-center justify-between gap-3">
            <span>Status</span>
            <Badge size="sm" color={statusColor(booking.status)} type="pill-color">
              {statusLabel(booking)}
            </Badge>
          </div>
          <p>Confirmation {booking.confirmationCode}</p>
        </div>
      </section>
    </div>
  )
}
