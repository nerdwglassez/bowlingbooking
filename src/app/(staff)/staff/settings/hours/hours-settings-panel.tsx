'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  OperatingHoursEditor,
  type LaneConfigDisplay,
  type OperatingHourRow,
} from '@/components/patterns/operating-hours-editor'
import type { AdminOperatingHour, AdminTenantDetail } from '@/lib/actions/admin'
import {
  updateOperatingHoursAction,
  updateTenantAction,
} from '@/lib/actions/admin'

function ensureSevenDays(initial: AdminOperatingHour[]): OperatingHourRow[] {
  const byDay = new Map(initial.map((h) => [h.dayOfWeek, h]))
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = byDay.get(dayOfWeek)
    if (existing) {
      return {
        dayOfWeek,
        openTime: existing.openTime,
        closeTime: existing.closeTime,
        closed: existing.closed,
      }
    }
    return { dayOfWeek, openTime: '14:00', closeTime: '23:00', closed: false }
  })
}

export function HoursSettingsPanel({
  tenantId,
  initialHours,
  tenant,
  readOnly,
}: {
  tenantId: string
  initialHours: AdminOperatingHour[]
  tenant: AdminTenantDetail
  readOnly?: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<OperatingHourRow[]>(() =>
    ensureSevenDays(initialHours),
  )
  const [laneConfig, setLaneConfig] = useState<LaneConfigDisplay>({
    totalLanes: tenant.totalLanes,
    maxBowlersPerLane: 6,
    minDurationHours: tenant.minBookingDurationHours,
    maxDurationHours: tenant.maxBookingDurationHours,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await updateOperatingHoursAction({ tenantId, hours: values })
        await updateTenantAction({
          tenantId: tenant.id,
          name: tenant.name,
          address: tenant.address,
          phone: tenant.phone,
          timezone: tenant.timezone,
          themeSlug: tenant.themeSlug,
          holdTimeoutMins: tenant.holdTimeoutMins,
          maxOnlineBowlers: tenant.maxOnlineBowlers,
          cancellationWindowHours: tenant.cancellationWindowHours,
          cancellationRefundPercent: tenant.cancellationRefundPercent,
          contactEmail: tenant.contactEmail,
          minBookingDurationHours: laneConfig.minDurationHours,
          maxBookingDurationHours: laneConfig.maxDurationHours,
        })
        setSuccess('Operating hours saved.')
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not save operating hours.',
        )
      }
    })
  }

  return (
    <OperatingHoursEditor
      values={values}
      onChange={setValues}
      laneConfig={laneConfig}
      onLaneConfigChange={readOnly ? undefined : setLaneConfig}
      onSubmit={handleSubmit}
      submitting={submitting}
      readOnly={readOnly}
      error={error}
      successMessage={success}
    />
  )
}
