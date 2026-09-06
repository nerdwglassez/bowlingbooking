'use client'

// OperatingHoursPanel — client island for the weekly hours editor.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  OperatingHoursEditor,
  type OperatingHourRow,
} from '@/components/patterns/operating-hours-editor'
import type { AdminOperatingHour } from '@/lib/actions/admin'
import { runStaffAction } from '@/lib/refresh-after-action'
import { updateOperatingHoursAction } from '@/lib/actions/admin'

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

export function OperatingHoursPanel({
  tenantId,
  initial,
}: {
  tenantId: string
  initial: AdminOperatingHour[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<OperatingHourRow[]>(() =>
    ensureSevenDays(initial),
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    runStaffAction({
      startTransition,
      action: () => updateOperatingHoursAction({ tenantId, hours: values }),
      onSuccess: () => setSuccess('Operating hours saved.'),
      onError: (err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not save operating hours.',
        )
      },
      refresh: () => router.refresh(),
    })
  }

  return (
    <OperatingHoursEditor
      values={values}
      onChange={setValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      successMessage={success}
    />
  )
}
