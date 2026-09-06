'use client'

// VenueDetailsPanel — client island for the venue details form.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  VenueDetailsForm,
  type VenueDetailsFormValues,
} from '@/components/patterns/venue-details-form'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { refreshAfterAction } from '@/lib/refresh-after-action'
import { updateTenantAction } from '@/lib/actions/admin'

export function VenueDetailsPanel({
  initial,
}: {
  initial: AdminTenantDetail
}) {
  const router = useRouter()
  const [values, setValues] = useState<VenueDetailsFormValues>({
    name: initial.name,
    address: initial.address,
    phone: initial.phone,
    timezone: initial.timezone,
    themeSlug: initial.themeSlug,
    holdTimeoutMins: initial.holdTimeoutMins,
    maxOnlineBowlers: initial.maxOnlineBowlers,
    cancellationWindowHours: initial.cancellationWindowHours,
    cancellationRefundPercent: initial.cancellationRefundPercent,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await updateTenantAction({ tenantId: initial.id, ...values })
        setSuccess('Venue details saved.')
        refreshAfterAction(() => router.refresh())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not save venue details.',
        )
      }
    })
  }

  return (
    <VenueDetailsForm
      values={values}
      onChange={setValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      successMessage={success}
    />
  )
}
