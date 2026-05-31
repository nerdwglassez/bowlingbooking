'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  BookingPoliciesForm,
  type BookingPoliciesFormValues,
} from '@/components/patterns/booking-policies-form'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { updateTenantAction } from '@/lib/actions/admin'

export function PoliciesSettingsPanel({
  initial,
  readOnly,
}: {
  initial: AdminTenantDetail
  readOnly?: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<BookingPoliciesFormValues>({
    holdTimeoutMins: initial.holdTimeoutMins,
    maxOnlineBowlers: initial.maxOnlineBowlers,
    cancellationWindowHours: initial.cancellationWindowHours,
    cancellationRefundPercent: initial.cancellationRefundPercent,
    timezone: initial.timezone,
    themeSlug: initial.themeSlug,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await updateTenantAction({
          tenantId: initial.id,
          name: initial.name,
          address: initial.address,
          phone: initial.phone,
          timezone: values.timezone,
          themeSlug: values.themeSlug,
          holdTimeoutMins: values.holdTimeoutMins,
          maxOnlineBowlers: values.maxOnlineBowlers,
          cancellationWindowHours: values.cancellationWindowHours,
          cancellationRefundPercent: values.cancellationRefundPercent,
          contactEmail: initial.contactEmail,
        })
        setSuccess('Policies saved.')
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not save policies.',
        )
      }
    })
  }

  return (
    <BookingPoliciesForm
      values={values}
      onChange={setValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      readOnly={readOnly}
      error={error}
      successMessage={success}
    />
  )
}
