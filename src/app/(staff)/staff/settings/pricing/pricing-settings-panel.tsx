'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  PricingSettingsForm,
  type PricingSettingsFormValues,
  type PricingStrategy,
} from '@/components/patterns/pricing-settings-form'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { updateTenantAction } from '@/lib/actions/admin'

function toStrategy(value: string): PricingStrategy {
  if (
    value === 'per_person_hour' ||
    value === 'per_lane_hour' ||
    value === 'per_person_game' ||
    value === 'packages_only'
  ) {
    return value
  }
  return 'packages_only'
}

export function PricingSettingsPanel({
  initial,
  readOnly,
}: {
  initial: AdminTenantDetail
  readOnly?: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<PricingSettingsFormValues>({
    strategy: toStrategy(initial.pricingStrategy),
    defaultRateCents: initial.laneReservationCentsPerLane,
    shoeRentalCents: initial.shoeRentalPriceCents,
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
          timezone: initial.timezone,
          themeSlug: initial.themeSlug,
          holdTimeoutMins: initial.holdTimeoutMins,
          maxOnlineBowlers: initial.maxOnlineBowlers,
          cancellationWindowHours: initial.cancellationWindowHours,
          cancellationRefundPercent: initial.cancellationRefundPercent,
          contactEmail: initial.contactEmail,
          shoeRentalPriceCents: values.shoeRentalCents,
          laneReservationCentsPerLane: values.defaultRateCents,
          pricingStrategy: values.strategy,
        })
        setSuccess('Pricing saved.')
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not save pricing.',
        )
      }
    })
  }

  return (
    <PricingSettingsForm
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
