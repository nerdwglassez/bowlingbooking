'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus } from '@untitledui/icons'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import {
  PricingSettingsForm,
  type PricingSettingsFormValues,
  type PricingStrategy,
} from '@/components/patterns/pricing-settings-form'
import {
  RateOverrideSheetForm,
  rateOverrideFromRow,
  type RateOverrideFormValues,
} from '@/components/patterns/rate-override-sheet'
import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import { formatPrice } from '@/lib/pricing'
import { useSettingsFormReporter } from '@/lib/settings-form-context'
import { useSettingsFormState } from '@/lib/use-settings-form-state'
import type { AdminPricingPeriodRow, AdminTenantDetail } from '@/lib/actions/admin'
import { refreshAfterAction } from '@/lib/refresh-after-action'
import {
  deletePricingPeriodAction,
  updateTenantAction,
  upsertPricingPeriodAction,
} from '@/lib/actions/admin'

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

const EMPTY_PERIOD: RateOverrideFormValues = {
  name: '',
  ratePerPersonPerHour: 850,
  daysOfWeek: [5, 6],
  startTime: '17:00',
  endTime: '22:00',
  priority: 1,
}

export function PricingSettingsPanel({
  initial,
  periods: initialPeriods,
  readOnly,
}: {
  initial: AdminTenantDetail
  periods: AdminPricingPeriodRow[]
  readOnly?: boolean
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const [periods, setPeriods] = useState(initialPeriods)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [periodValues, setPeriodValues] = useState<RateOverrideFormValues>(EMPTY_PERIOD)
  const [periodSubmitting, startPeriodTransition] = useTransition()

  const form = useSettingsFormState<PricingSettingsFormValues>({
    strategy: toStrategy(initial.pricingStrategy),
    defaultRateCents: initial.laneReservationCentsPerLane,
    shoeRentalCents: initial.shoeRentalPriceCents,
  })

  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useSettingsFormReporter(
    form.dirty,
    form.phase === 'saving',
    () => handleSavePricing(),
  )

  function openNewPeriod() {
    setEditingId(null)
    setPeriodValues({ ...EMPTY_PERIOD })
    setSheetOpen(true)
  }

  function openEditPeriod(row: AdminPricingPeriodRow) {
    setEditingId(row.id)
    setPeriodValues(rateOverrideFromRow(row))
    setSheetOpen(true)
  }

  function handleSavePricing() {
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
          holdTimeoutMins: initial.holdTimeoutMins,
          maxOnlineBowlers: initial.maxOnlineBowlers,
          cancellationWindowHours: initial.cancellationWindowHours,
          cancellationRefundPercent: initial.cancellationRefundPercent,
          contactEmail: initial.contactEmail,
          shoeRentalPriceCents: form.values.shoeRentalCents,
          laneReservationCentsPerLane: form.values.defaultRateCents,
          pricingStrategy: form.values.strategy,
        })
        form.commitBaseline()
        showToast({ message: 'Pricing saved', variant: 'success' })
        refreshAfterAction(() => router.refresh())
      } catch (err) {
        form.setError()
        setError(err instanceof Error ? err.message : 'Could not save pricing.')
        showToast({ message: 'Failed to save — try again', variant: 'error' })
      }
    })
  }

  function savePeriod() {
    startPeriodTransition(async () => {
      try {
        const result = await upsertPricingPeriodAction({
          tenantId: initial.id,
          id: editingId ?? undefined,
          name: periodValues.name,
          ratePerPersonPerHour: periodValues.ratePerPersonPerHour,
          daysOfWeek: periodValues.daysOfWeek,
          startTime: periodValues.startTime || null,
          endTime: periodValues.endTime || null,
          priority: periodValues.priority,
        })
        setSheetOpen(false)
        showToast({ message: 'Rate override saved', variant: 'success' })
        refreshAfterAction(() => router.refresh())
        if (!editingId) {
          setPeriods((prev) => [
            ...prev,
            {
              id: result.id,
              name: periodValues.name,
              ratePerPersonPerHour: periodValues.ratePerPersonPerHour,
              daysOfWeek: periodValues.daysOfWeek,
              startTime: periodValues.startTime,
              endTime: periodValues.endTime,
              priority: periodValues.priority,
            },
          ])
        }
      } catch {
        showToast({ message: 'Failed to save period', variant: 'error' })
      }
    })
  }

  function deletePeriod() {
    if (!editingId) return
    startPeriodTransition(async () => {
      try {
        await deletePricingPeriodAction(initial.id, editingId)
        setSheetOpen(false)
        setPeriods((prev) => prev.filter((p) => p.id !== editingId))
        showToast({ message: 'Period deleted', variant: 'success' })
        refreshAfterAction(() => router.refresh())
      } catch {
        showToast({ message: 'Could not delete period', variant: 'error' })
      }
    })
  }

  return (
    <>
      <PricingSettingsForm
        values={form.values}
        onChange={form.setValues}
        onSubmit={handleSavePricing}
        readOnly={readOnly}
        error={error}
        periodsSlot={
          readOnly ? null : (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-1.5">
                {periods
                  .filter((p) => p.priority > 0)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openEditPeriod(p)}
                        className="flex w-full items-center gap-2.5 rounded-xl border border-solid border-secondary bg-primary px-3.5 py-3 text-left"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full bg-brand-solid"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-primary">
                            {p.name}
                          </span>
                          <span className="block text-sm text-tertiary">
                            Priority {p.priority}
                            {p.daysOfWeek.length
                              ? ` · ${p.daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
                              : ''}
                          </span>
                        </span>
                        <span className="[font-family:var(--font-display)] text-sm text-brand-secondary">
                          {formatPrice(p.ratePerPersonPerHour)}
                        </span>
                        <ChevronRight
                          className="size-3.5 text-tertiary"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={openNewPeriod}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-secondary py-3 text-xs font-medium text-tertiary"
              >
                <Plus className="size-3.5" aria-hidden />
                Add rate override
              </button>
            </div>
          )
        }
        saveButton={
          readOnly ? null : (
            <SettingsSaveButton
              label="Save pricing"
              dirty={form.dirty}
              phase={form.phase}
            />
          )
        }
      />

      <BottomSheet
        open={sheetOpen}
        title={editingId ? 'Edit rate override' : 'Add rate override'}
        onClose={() => setSheetOpen(false)}
      >
        <RateOverrideSheetForm
          values={periodValues}
          onChange={setPeriodValues}
          onSubmit={savePeriod}
          onDelete={editingId ? deletePeriod : undefined}
          submitting={periodSubmitting}
          isEdit={Boolean(editingId)}
        />
      </BottomSheet>
    </>
  )
}
