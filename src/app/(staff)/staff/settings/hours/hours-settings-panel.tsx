'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import {
  OperatingHoursEditor,
  type LaneConfigDisplay,
  type OperatingHourRow,
} from '@/components/patterns/operating-hours-editor'
import type { AdminOperatingHour, AdminTenantDetail } from '@/lib/actions/admin'
import {
  syncTenantLanesAction,
  updateOperatingHoursAction,
  updateTenantAction,
} from '@/lib/actions/admin'
import { useSettingsFormReporter } from '@/lib/settings-form-context'
import { useSettingsFormState } from '@/lib/use-settings-form-state'

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

type HoursFormState = {
  hours: OperatingHourRow[]
  laneConfig: LaneConfigDisplay
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
  const { showToast } = useStaffToast()
  const form = useSettingsFormState<HoursFormState>({
    hours: ensureSevenDays(initialHours),
    laneConfig: {
      totalLanes: tenant.totalLanes,
      maxBowlersPerLane: tenant.bowlersPerLane,
      minDurationHours: tenant.minBookingDurationHours,
      maxDurationHours: tenant.maxBookingDurationHours,
    },
  })
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useSettingsFormReporter(
    form.dirty,
    form.phase === 'saving',
    () => handleSubmit(),
  )

  function handleSubmit() {
    setError(null)
    form.startSaving()
    startTransition(async () => {
      try {
        await updateOperatingHoursAction({
          tenantId,
          hours: form.values.hours,
        })
        await syncTenantLanesAction(tenantId, form.values.laneConfig.totalLanes)
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
          bowlersPerLane: form.values.laneConfig.maxBowlersPerLane,
          minBookingDurationHours: form.values.laneConfig.minDurationHours,
          maxBookingDurationHours: form.values.laneConfig.maxDurationHours,
        })
        form.commitBaseline()
        showToast({ message: 'Operating hours saved', variant: 'success' })
        router.refresh()
      } catch (err) {
        form.setError()
        setError(
          err instanceof Error
            ? err.message
            : 'Could not save operating hours.',
        )
        showToast({ message: 'Failed to save — try again', variant: 'error' })
      }
    })
  }

  return (
    <OperatingHoursEditor
      values={form.values.hours}
      onChange={(hours) => form.setValues({ ...form.values, hours })}
      laneConfig={form.values.laneConfig}
      onLaneConfigChange={(laneConfig) =>
        form.setValues({ ...form.values, laneConfig })
      }
      onSubmit={handleSubmit}
      submitting={form.phase === 'saving'}
      readOnly={readOnly}
      error={error}
      saveDirty={form.dirty}
      savePhase={form.phase}
    />
  )
}
