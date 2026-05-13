'use client'

// WalkInPanel — client island that owns the WalkInForm state, computes the
// total via calculatePrice, dispatches createWalkInBooking, and routes to
// the new booking's detail page on success.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  WalkInForm,
  type WalkInFormValues,
} from '@/components/patterns/walk-in-form'
import { calculatePrice } from '@/lib/pricing'
import { createWalkInBooking } from '@/lib/actions/staff'
import type { Package } from '@/types'

interface WalkInPanelProps {
  tenantId: string
  packages: Package[]
}

function defaultValues(): WalkInFormValues {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  return {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bowlerCount: 1,
    packageId: '',
    startTime: `${yyyy}-${mm}-${dd}T${hh}:00`,
    durationMinutes: 60,
    paymentMethod: 'cash',
    notes: '',
  }
}

export function WalkInPanel({ tenantId, packages }: WalkInPanelProps) {
  const router = useRouter()
  const [values, setValues] = useState<WalkInFormValues>(defaultValues)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  const totalAmount = useMemo(() => {
    const pkg = packages.find((p) => p.id === values.packageId)
    if (!pkg) return 0
    return calculatePrice({
      package: pkg,
      bowlerCount: Math.max(1, values.bowlerCount),
    }).totalAmount
  }, [packages, values.packageId, values.bowlerCount])

  function handleSubmit() {
    setError(null)
    const pkg = packages.find((p) => p.id === values.packageId)
    if (!pkg) {
      setError('Choose a package.')
      return
    }
    const start = new Date(values.startTime)
    if (Number.isNaN(start.getTime())) {
      setError('Provide a valid start time.')
      return
    }
    const end = new Date(start.getTime() + values.durationMinutes * 60_000)
    const partyType = pkg.partyTypes[0] ?? 'OPEN'

    startTransition(async () => {
      try {
        const result = await createWalkInBooking({
          tenantId,
          packageId: pkg.id,
          partyType,
          bowlerCount: values.bowlerCount,
          startTime: start,
          endTime: end,
          totalAmount,
          customerName: values.customerName.trim() || 'Walk-in customer',
          customerEmail: values.customerEmail.trim(),
          customerPhone: values.customerPhone.trim() || undefined,
          notes: values.notes.trim() || undefined,
          paymentMethod: values.paymentMethod,
        })
        router.push(`/staff/bookings/${result.bookingId}`)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not create walk-in booking.',
        )
      }
    })
  }

  return (
    <WalkInForm
      values={values}
      packages={packages}
      totalAmount={totalAmount}
      onChange={setValues}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  )
}
