'use client'

// WalkInSheet — 3-step walk-in flow over dimmed cockpit (walkin-booking-flow.html).

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

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

  if (!open) return null

  const startedAt = resolveStartTime()

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bottom-16 z-30 bg-transparent md:right-[400px]"
        aria-label="Close walk-in"
        onClick={requestClose}
      />
      <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-in-sheet-title"
      className="fixed inset-x-0 bottom-16 z-40 flex max-h-[min(72dvh,640px)] flex-col border-t border-solid border-[var(--color-border)] bg-[var(--surface-raised)] shadow-[var(--shadow-xl)] md:inset-y-0 md:bottom-0 md:left-auto md:max-h-none md:w-[400px] md:border-l md:border-t-0"
    >
      <div
        className="mx-auto mt-3 h-[3px] w-8 shrink-0 rounded-full bg-[var(--color-border-strong)] md:hidden"
        aria-hidden
      />

      <div className="flex items-center justify-between px-[18px] pb-3 pt-3.5">
        <h2
          id="walk-in-sheet-title"
          className="text-[17px] [font-family:var(--font-display)] text-[var(--color-text-primary)]"
        >
          {STEP_TITLE[step]}
        </h2>
        <div className="flex items-center gap-3">
          <WalkInStepIndicator step={step} />
          <button
            type="button"
            className="text-[11px] font-semibold text-[var(--color-text-secondary)]"
            onClick={requestClose}
            aria-label="Close walk-in sheet"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
      </div>
    </div>
    </>
  )
}
