'use server'

import { redirect } from 'next/navigation'

import { policySnapshotFromBooking, policySnapshotFromTenantRow } from '@/lib/booking-snapshots'
import { requireUser } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

export interface DashboardBookingRow {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  packageName: string
  totalAmount: number
  status: string
  cancellable: boolean
  refundIfCancelled: number
  policyWindowHours: number
  policyRefundPercent: number
}

export async function getDashboardBookings(): Promise<DashboardBookingRow[]> {
  const user = await requireUser()
  if (user.role !== 'CUSTOMER') {
    redirect('/staff')
  }

  if (isDevWithoutDb()) {
    const start = new Date(Date.now() + 48 * 3_600_000)
    const end = new Date(start.getTime() + 3_600_000)
    return [
      {
        id: 'bk_mock_dashboard',
        confirmationCode: 'MOCK01',
        startTime: start,
        endTime: end,
        bowlerCount: 4,
        laneCount: 1,
        packageName: 'Classic Bowling',
        totalAmount: 4500,
        status: 'CONFIRMED',
        cancellable: true,
        refundIfCancelled: 4500,
        policyWindowHours: 24,
        policyRefundPercent: 100,
      },
    ]
  }

  const tenant = await getTenant()
  const tenantPolicy = policySnapshotFromTenantRow({
    cancellationWindowHours: tenant.cancellationWindowHours,
    rescheduleWindowHours: tenant.rescheduleWindowHours,
    bowlersPerLane: tenant.bowlersPerLane,
    cancellationRefundPercent: tenant.cancellationRefundPercent,
  })

  const email = user.email?.trim().toLowerCase()
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: tenant.id,
      OR: [{ userId: user.id }, ...(email ? [{ customerEmail: email }] : [])],
      status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'PENDING_PAYMENT'] },
    },
    include: { package: { select: { name: true } } },
    orderBy: { startTime: 'asc' },
  })

  const now = new Date()
  return bookings.map((b) => {
    const policy = policySnapshotFromBooking(b, tenantPolicy)
    const cutoff = new Date(
      b.startTime.getTime() - policy.cancellationWindowHours * 3_600_000,
    )
    const isPast = b.startTime <= now
    const withinWindow = now <= cutoff
    const cancellable =
      !isPast && b.status !== 'CANCELLED' && !b.isRefunded
    const refundIfCancelled =
      cancellable && withinWindow
        ? Math.floor(
            (b.totalAmount * policy.cancellationRefundPercent) / 100,
          )
        : 0
    return {
      id: b.id,
      confirmationCode: b.confirmationCode,
      startTime: b.startTime,
      endTime: b.endTime,
      bowlerCount: b.bowlerCount,
      laneCount: b.laneCount,
      packageName: b.package.name,
      totalAmount: b.totalAmount,
      status: b.status,
      cancellable,
      refundIfCancelled,
      policyWindowHours: policy.cancellationWindowHours,
      policyRefundPercent: policy.cancellationRefundPercent,
    }
  })
}
