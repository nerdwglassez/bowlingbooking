'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { PromoForm, type PromoFormValues } from '@/components/patterns/promo-form'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import {
  createPromoAction,
  deactivatePromoAction,
  updatePromoAction,
  type AdminPromoDetail,
  type PromoInput,
} from '@/lib/actions/admin'

function expiresToLocal(d: Date | null): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}

function localToDate(iso: string): Date | null {
  const t = iso.trim()
  if (!t) return null
  const dt = new Date(t)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function defaultValues(initial?: AdminPromoDetail): PromoFormValues {
  return {
    code: initial?.code ?? '',
    description: initial?.description ?? '',
    discountType: initial?.discountType ?? 'PERCENT',
    discountValue: initial?.discountValue ?? 10,
    maxUsesEnabled: initial?.maxUses != null,
    maxUses: initial?.maxUses ?? 100,
    expiresEnabled: initial?.expiresAt != null,
    expiresAtLocal: expiresToLocal(initial?.expiresAt ?? null),
  }
}

function toInput(tenantId: string, values: PromoFormValues): PromoInput {
  return {
    tenantId,
    code: values.code,
    description: values.description.trim() || null,
    discountType: values.discountType,
    discountValue: values.discountValue,
    maxUses: values.maxUsesEnabled ? values.maxUses : null,
    expiresAt: values.expiresEnabled ? localToDate(values.expiresAtLocal) : null,
  }
}

export function PromoEditor({
  mode,
  tenantId,
  initial,
}: {
  mode: 'create' | 'edit'
  tenantId: string
  initial?: AdminPromoDetail
}) {
  const router = useRouter()
  const [values, setValues] = useState<PromoFormValues>(() =>
    defaultValues(initial),
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()
  const [deactivating, startDeactivate] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createPromoAction(toInput(tenantId, values))
          router.push(`/admin/promos/${result.id}`)
          return
        }
        if (!initial) throw new Error('Missing promo id.')
        await updatePromoAction({ ...toInput(tenantId, values), id: initial.id })
        setSuccess('Promo saved.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save promo.')
      }
    })
  }

  function handleDeactivate() {
    if (!initial) return
    setError(null)
    setSuccess(null)
    startDeactivate(async () => {
      try {
        await deactivatePromoAction(initial.id)
        router.push('/admin/promos')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not deactivate.')
      }
    })
  }

  return (
    <>
      <PromoForm
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        successMessage={success}
        submitLabel={mode === 'create' ? 'Create promo' : 'Save promo'}
      />
      {mode === 'edit' && initial?.active ? (
        <Card>
          <CardBody className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">
                Deactivate this promo
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Hides the code from new bookings. Existing bookings keep their
                references.
              </span>
            </div>
            <Button
              variant="danger"
              onClick={handleDeactivate}
              loading={deactivating}
            >
              Deactivate
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </>
  )
}
