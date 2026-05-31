'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  VenueInfoForm,
  venueInfoFromTenant,
  venueInfoToAddress,
  type VenueInfoFormValues,
} from '@/components/patterns/venue-info-form'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { updateTenantAction } from '@/lib/actions/admin'

export function VenueInfoPanel({ initial }: { initial: AdminTenantDetail }) {
  const router = useRouter()
  const [values, setValues] = useState<VenueInfoFormValues>(() =>
    venueInfoFromTenant({
      name: initial.name,
      address: initial.address,
      phone: initial.phone,
      contactEmail: initial.contactEmail,
    }),
  )
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
          name: values.name.trim(),
          address: venueInfoToAddress(values),
          phone: values.phone.trim(),
          timezone: initial.timezone,
          themeSlug: initial.themeSlug,
          holdTimeoutMins: initial.holdTimeoutMins,
          maxOnlineBowlers: initial.maxOnlineBowlers,
          cancellationWindowHours: initial.cancellationWindowHours,
          cancellationRefundPercent: initial.cancellationRefundPercent,
          contactEmail: values.contactEmail.trim(),
        })
        setSuccess('Venue info updated.')
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not save venue info.',
        )
      }
    })
  }

  return (
    <VenueInfoForm
      values={values}
      onChange={setValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      successMessage={success}
    />
  )
}
