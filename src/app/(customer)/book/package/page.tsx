'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { redirect, useRouter } from 'next/navigation'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { VenueHeader } from '@/components/patterns/venue-header'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { LaneAllocationView } from '@/components/patterns/lane-allocation-view'
import { PackageListToolbar } from '@/components/patterns/package-list-toolbar'
import { PackageCard } from '@/components/patterns/package-card'
import { PriceFooter } from '@/components/patterns/price-footer'
import { useBooking } from '@/context/BookingContext'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { formatPackageStepSubtitle } from '@/lib/booking-display'
import { calculatePrice } from '@/lib/pricing'
import { useWallClockNow } from '@/lib/use-wall-clock'
import type { Package, PricingResult } from '@/types'

const EMPTY_PRICING: PricingResult = {
  baseAmount: 0,
  gameAmount: 0,
  shoeAmount: 0,
  totalAmount: 0,
  lineItems: [],
}

export default function PackagePage() {
  const router = useRouter()
  const tenant = useTenant()
  const { session, setPackage } = useBooking()
  const [packages, setPackages] = useState<Package[]>([])

  useEffect(() => {
    let cancelled = false
    void getPackagesForTenant(tenant.id).then((rows) => {
      if (!cancelled) setPackages(rows)
    })
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  const pricing = useMemo(() => {
    if (session.selectedPackage == null) {
      return EMPTY_PRICING
    }
    return calculatePrice({
      package: session.selectedPackage,
      bowlerCount: session.bowlerCount!,
    })
  }, [session.selectedPackage, session.bowlerCount])

  const now = useWallClockNow()

  const canProceed =
    session.packageId != null &&
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > now

  const handlePackageSelect = useCallback(
    (pkg: Package) => {
      const result = calculatePrice({
        package: pkg,
        bowlerCount: session.bowlerCount!,
      })
      setPackage(pkg, result.totalAmount)
    },
    [session.bowlerCount, setPackage],
  )

  const handleNext = useCallback(() => {
    router.push('/book/confirm')
  }, [router])

  const handleHoldExpired = useCallback(() => {
    router.push('/book/time')
  }, [router])

  const packageSubtitle =
    session.bowlerCount != null &&
    session.date != null &&
    session.startTime != null
      ? formatPackageStepSubtitle(
          session.bowlerCount,
          session.date,
          session.startTime,
        )
      : ''

  const packageCtaLabel = canProceed
    ? 'Continue to checkout'
    : 'Select a package to continue'

  if (session.timeSlotId == null) {
    redirect('/book/time')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <VenueHeader
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push('/signin')
        }}
      />
      <StepIndicator currentStep={2} />
      <HoldTimer expiresAt={session.holdExpiresAt} onExpire={handleHoldExpired} />

      <BookingFlowLead
        title="Choose a package"
        subtitle={packageSubtitle}
      />
      <PackageListToolbar resultCount={packages.length} />
      <LaneAllocationView bowlerCount={session.bowlerCount!} />

      <div className="flex flex-col gap-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={session.packageId === pkg.id}
            onSelect={handlePackageSelect}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <PriceFooter
          pricing={pricing}
          ctaLabel={packageCtaLabel}
          onCta={handleNext}
          ctaDisabled={!canProceed}
        />
      </div>
    </main>
  )
}
