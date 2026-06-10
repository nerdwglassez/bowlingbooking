import type { Tenant as PrismaTenant } from '@/generated/prisma/client'

export interface BookingPolicySnapshot {
  cancellationWindowHours: number
  rescheduleWindowHours: number
  bowlersPerLane: number
  cancellationRefundPercent: number
}

export function policySnapshotFromTenantRow(
  row: Pick<
    PrismaTenant,
    | 'cancellationWindowHours'
    | 'rescheduleWindowHours'
    | 'bowlersPerLane'
    | 'cancellationRefundPercent'
  >,
): BookingPolicySnapshot {
  return {
    cancellationWindowHours: row.cancellationWindowHours,
    rescheduleWindowHours: row.rescheduleWindowHours,
    bowlersPerLane: row.bowlersPerLane,
    cancellationRefundPercent: row.cancellationRefundPercent,
  }
}

export function policySnapshotFromBooking(
  booking: {
    cancellationWindowHoursSnapshot: number | null
    rescheduleWindowHoursSnapshot: number | null
    bowlersPerLaneSnapshot: number | null
    cancellationRefundPercentSnapshot: number | null
  },
  tenantFallback: BookingPolicySnapshot,
): BookingPolicySnapshot {
  return {
    cancellationWindowHours:
      booking.cancellationWindowHoursSnapshot ??
      tenantFallback.cancellationWindowHours,
    rescheduleWindowHours:
      booking.rescheduleWindowHoursSnapshot ??
      tenantFallback.rescheduleWindowHours,
    bowlersPerLane:
      booking.bowlersPerLaneSnapshot ?? tenantFallback.bowlersPerLane,
    cancellationRefundPercent:
      booking.cancellationRefundPercentSnapshot ??
      tenantFallback.cancellationRefundPercent,
  }
}
