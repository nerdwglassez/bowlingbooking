'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import {
  BookingPoliciesForm,
  type BookingPoliciesFormValues,
} from '@/components/patterns/booking-policies-form'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { updateTenantAction } from '@/lib/actions/admin'
import { refreshAfterAction } from '@/lib/refresh-after-action'
import { useSettingsFormReporter } from '@/lib/settings-form-context'
import { useSettingsFormState } from '@/lib/use-settings-form-state'

export function PoliciesSettingsPanel({
  initial,
  readOnly,
}: {
  initial: AdminTenantDetail
  readOnly?: boolean
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const form = useSettingsFormState<BookingPoliciesFormValues>({
    holdTimeoutMins: initial.holdTimeoutMins,
    minBookingNoticeMinutes: initial.minBookingNoticeMinutes,
    cancellationWindowHours: initial.cancellationWindowHours,
    rescheduleWindowHours: initial.rescheduleWindowHours,
    checkInWindowMinutes: initial.checkInWindowMinutes,
    cancellationRefundPercent: initial.cancellationRefundPercent,
    maxOnlineBowlers: initial.maxOnlineBowlers,
    maxAdvanceBookingDays: initial.maxAdvanceBookingDays,
    lateGraceMinutes: initial.lateGraceMinutes,
    allowWalkInBookings: initial.allowWalkInBookings,
    requireAccountToModify: initial.requireAccountToModify,
  })
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const savingRef = useRef(false)

  useSettingsFormReporter(
    form.dirty,
    form.phase === 'saving',
    () => handleSubmit(),
  )

  function handleSubmit() {
    if (savingRef.current || form.phase === 'saving') return
    savingRef.current = true
    setError(null)
    form.startSaving()
    startTransition(async () => {
      try {
        await updateTenantAction({
          tenantId: initial.id,
          name: initial.name,
          address: initial.address,
          phone: initial.phone,
          timezone: initial.timezone,
          themeSlug: initial.themeSlug,
          holdTimeoutMins: form.values.holdTimeoutMins,
          maxOnlineBowlers: form.values.maxOnlineBowlers,
          cancellationWindowHours: form.values.cancellationWindowHours,
          cancellationRefundPercent: form.values.cancellationRefundPercent,
          rescheduleWindowHours: form.values.rescheduleWindowHours,
          checkInWindowMinutes: form.values.checkInWindowMinutes,
          bowlersPerLane: initial.bowlersPerLane,
          minBookingNoticeMinutes: form.values.minBookingNoticeMinutes,
          maxAdvanceBookingDays: form.values.maxAdvanceBookingDays,
          lateGraceMinutes: form.values.lateGraceMinutes,
          allowWalkInBookings: form.values.allowWalkInBookings,
          requireAccountToModify: form.values.requireAccountToModify,
          contactEmail: initial.contactEmail,
        })
        form.commitBaseline()
        showToast({ message: 'Policies saved', variant: 'success' })
        refreshAfterAction(() => router.refresh())
      } catch (err) {
        form.setError()
        setError(err instanceof Error ? err.message : 'Could not save policies.')
        showToast({ message: 'Failed to save — try again', variant: 'error' })
      } finally {
        savingRef.current = false
      }
    })
  }

  return (
    <BookingPoliciesForm
      values={form.values}
      onChange={form.setValues}
      onSubmit={handleSubmit}
      readOnly={readOnly}
      error={error}
      dirty={form.dirty}
      phase={form.phase}
    />
  )
}
