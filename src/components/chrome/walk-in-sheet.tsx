'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { WalkInConfirmStep } from '@/components/patterns/walk-in-confirm-step'
import {
  WalkInGuestStep,
  type WalkInGuestStepValues,
} from '@/components/patterns/walk-in-guest-step'
import { WalkInPackageLaneStep } from '@/components/patterns/walk-in-package-lane-step'
import { WalkInStepIndicator } from '@/components/patterns/walk-in-step-indicator'
import type {
  CockpitLaneCard,
  WalkInPaymentMethod,
} from '@/lib/actions/staff'
import { createWalkInBooking } from '@/lib/actions/staff'
import { calculatePrice } from '@/lib/pricing'
import {
  hasWalkInDraft,
  pickAutoLanes,
  toDatetimeLocalValue,
  walkInSourceToDb,
  walkInStartNow,
} from '@/lib/walk-in-display'
import type { Package } from '@/types'

export type WalkInSheetProps = {
  open: boolean
  tenantId: string
  packages: Package[]
  lanes: CockpitLaneCard[]
  referenceNow: string
  onClose: () => void
}

type Step = 1 | 2 | 3

function defaultGuestValues(referenceNow: string): WalkInGuestStepValues {
  const now = walkInStartNow(new Date(referenceNow))
  return {
    source: 'walk_in',
    customerName: '',
    customerEmail: '',
    bowlerCount: 4,
    scheduledStart: toDatetimeLocalValue(now),
  }
}

function defaultPackageLaneValues() {
  return {
    packageId: '',
    laneNumbers: [] as number[],
    laneOverrideOpen: false,
  }
}

const STEP_TITLE: Record<Step, string> = {
  1: 'New booking',
  2: 'Package & lane',
  3: 'Confirm booking',
}

export function WalkInSheet({
  open,
  tenantId,
  packages,
  lanes,
  referenceNow,
  onClose,
}: WalkInSheetProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [guest, setGuest] = useState<WalkInGuestStepValues>(() =>
    defaultGuestValues(referenceNow),
  )
  const [packageLane, setPackageLane] = useState(defaultPackageLaneValues)
  const [paymentMethod, setPaymentMethod] =
    useState<WalkInPaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  const referenceDate = useMemo(
    () => new Date(referenceNow),
    [referenceNow],
  )

  const autoLaneNumbers = useMemo(
    () => pickAutoLanes(lanes, guest.bowlerCount),
    [lanes, guest.bowlerCount],
  )

  const resolvedLaneNumbers =
    packageLane.laneOverrideOpen && packageLane.laneNumbers.length > 0
      ? packageLane.laneNumbers
      : autoLaneNumbers

  const selectedPackage = packages.find((p) => p.id === packageLane.packageId)

  const totalAmount = useMemo(() => {
    if (!selectedPackage) return 0
    return calculatePrice({
      package: selectedPackage,
      bowlerCount: guest.bowlerCount,
    }).totalAmount
  }, [selectedPackage, guest.bowlerCount])

  function resetForm() {
    setStep(1)
    setGuest(defaultGuestValues(referenceNow))
    setPackageLane(defaultPackageLaneValues())
    setPaymentMethod('cash')
    setError(null)
  }

  function requestClose() {
    if (step === 1 && !hasWalkInDraft(guest)) {
      resetForm()
      onClose()
      return
    }
    if (
      window.confirm(
        'Discard this booking? Your entries will be lost.',
      )
    ) {
      resetForm()
      onClose()
    }
  }

  function resolveStartTime(): Date {
    if (guest.source === 'walk_in') {
      return walkInStartNow(referenceDate)
    }
    const scheduled = new Date(guest.scheduledStart)
    if (Number.isNaN(scheduled.getTime())) {
      return walkInStartNow(referenceDate)
    }
    return scheduled
  }

  function handleSubmit() {
    setError(null)
    const startTime = resolveStartTime()
    const endTime = new Date(startTime.getTime() + 60 * 60_000)
    const partyType = selectedPackage?.partyTypes[0] ?? 'OPEN'

    startTransition(async () => {
      try {
        await createWalkInBooking({
          tenantId,
          packageId: packageLane.packageId || null,
          partyType,
          bowlerCount: guest.bowlerCount,
          startTime,
          endTime,
          totalAmount,
          customerName: guest.customerName.trim(),
          customerEmail: guest.customerEmail.trim(),
          source: walkInSourceToDb(guest.source),
          laneNumbers: resolvedLaneNumbers,
          paymentMethod,
        })
        resetForm()
        onClose()
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not create walk-in booking.',
        )
      }
    })
  }

  const startedAt = resolveStartTime()

  return (
    <BottomSheet open={open} title={STEP_TITLE[step]} onClose={requestClose}>
      <WalkInStepIndicator step={step} />

      {step === 1 ? (
        <WalkInGuestStep
          values={guest}
          onChange={setGuest}
          onNext={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <WalkInPackageLaneStep
          values={packageLane}
          packages={packages}
          lanes={lanes}
          autoLaneNumbers={autoLaneNumbers}
          onChange={setPackageLane}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <WalkInConfirmStep
          values={{
            source: guest.source,
            customerName: guest.customerName.trim(),
            bowlerCount: guest.bowlerCount,
            packageName: selectedPackage?.name ?? '',
            laneNumbers: resolvedLaneNumbers,
            startedAt,
            paymentMethod,
          }}
          onChangePayment={setPaymentMethod}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      ) : null}
    </BottomSheet>
  )
}
