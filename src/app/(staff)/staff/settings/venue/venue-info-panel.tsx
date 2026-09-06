'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import {
  VenueInfoForm,
  venueInfoFromTenant,
  venueInfoToAddress,
  type VenueInfoFormValues,
} from '@/components/patterns/venue-info-form'
import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import type { AdminTenantDetail } from '@/lib/actions/admin'
import { updateTenantAction } from '@/lib/actions/admin'
import { runStaffAction } from '@/lib/refresh-after-action'
import { useSettingsFormReporter } from '@/lib/settings-form-context'
import { useSettingsFormState } from '@/lib/use-settings-form-state'

export function VenueInfoPanel({ initial }: { initial: AdminTenantDetail }) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const form = useSettingsFormState<VenueInfoFormValues>(
    venueInfoFromTenant({
      name: initial.name,
      address: initial.address,
      phone: initial.phone,
      contactEmail: initial.contactEmail,
    }),
  )
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
    runStaffAction({
      startTransition,
      action: () =>
        updateTenantAction({
          tenantId: initial.id,
          name: form.values.name.trim(),
          address: venueInfoToAddress(form.values),
          phone: form.values.phone.trim(),
          timezone: initial.timezone,
          themeSlug: initial.themeSlug,
          holdTimeoutMins: initial.holdTimeoutMins,
          maxOnlineBowlers: initial.maxOnlineBowlers,
          cancellationWindowHours: initial.cancellationWindowHours,
          cancellationRefundPercent: initial.cancellationRefundPercent,
          contactEmail: form.values.contactEmail.trim(),
        }),
      onSuccess: () => {
        form.commitBaseline()
        showToast({ message: 'Venue info updated', variant: 'success' })
        savingRef.current = false
      },
      onError: (err) => {
        form.setError()
        setError(
          err instanceof Error ? err.message : 'Could not save venue info.',
        )
        showToast({ message: 'Failed to save — try again', variant: 'error' })
        savingRef.current = false
      },
      refresh: () => router.refresh(),
    })
  }

  return (
    <VenueInfoForm
      values={form.values}
      onChange={form.setValues}
      onSubmit={handleSubmit}
      error={error}
      saveButton={
        <SettingsSaveButton
          label="Save venue info"
          dirty={form.dirty}
          phase={form.phase}
        />
      }
    />
  )
}
