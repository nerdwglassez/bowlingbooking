'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useLanePricingContext,
  useTenant,
} from '@/app/(customer)/book/tenant-provider'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { BookingFlowShell } from '@/components/patterns/booking-flow-shell'
import { BookingFlowFooter } from '@/components/patterns/booking-flow-footer'
import { PackageListToolbar } from '@/components/patterns/package-list-toolbar'
import { PackageAddonSection } from '@/components/patterns/package-addon-section'
import { PackageCard } from '@/components/patterns/package-card'
import { PackageDetailSheet } from '@/components/patterns/package-detail-sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { useBooking } from '@/context/BookingContext'
import { formatPackageStepSubtitle } from '@/lib/booking-display'
import { BOOKING_BACK_BY_STEP } from '@/lib/booking-flow-nav'
import {
  calculateBookingTotal,
  calculatePackageStepTotal,
} from '@/lib/pricing'
import { useHoldExpiry } from '@/lib/use-hold-expiry'
import { useWallClockNow } from '@/lib/use-wall-clock'
import type { Package } from '@/types'

function PackageCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--surface-card)] p-[14px]">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="size-[18px] shrink-0 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-6 w-28" />
      <Skeleton className="mt-2 h-8 w-full" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
  )
}

export default function PackagePage() {
  const router = useRouter()
  const tenant = useTenant()
  const { session, setPackage, clearPackage, setTimeSlot, setBookingTotal, toggleOptionalAddon } =
    useBooking()
  const [packages, setPackages] = useState<Package[]>([])
  const [packagesPending, setPackagesPending] = useState(true)
  const [detailPkg, setDetailPkg] = useState<Package | null>(null)

  useEffect(() => {
    let cancelled = false
    void getPackagesForTenant(tenant.id)
      .then((rows) => {
        if (!cancelled) setPackages(rows)
      })
      .finally(() => {
        if (!cancelled) setPackagesPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  const laneReservationCents =
    (session.laneCount ?? 1) * tenant.laneReservationCentsPerLane
  const pricingContext = useLanePricingContext({
    bowlerCount: session.bowlerCount ?? 1,
    laneCount: session.laneCount ?? 1,
    startTime: session.startTime,
    endTime: session.endTime,
  })

  const pricing = useMemo(() => {
    if (session.selectedPackage != null) {
      return calculatePackageStepTotal({
        package: session.selectedPackage,
        bowlerCount: session.bowlerCount!,
        selectedOptionalAddonIds: session.selectedOptionalAddonIds,
      })
    }
    return calculateBookingTotal({
      package: null,
      bowlerCount: session.bowlerCount ?? 1,
      laneCount: session.laneCount ?? 1,
      shoeSelections: [],
      shoeRentalPriceCents: tenant.shoeRentalPriceCents,
      laneReservationCents,
      pricingContext,
    })
  }, [
    session.selectedPackage,
    session.bowlerCount,
    session.laneCount,
    tenant.shoeRentalPriceCents,
    laneReservationCents,
    session.selectedOptionalAddonIds,
    pricingContext,
  ])

  const now = useWallClockNow()

  const holdValid =
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > now

  const handlePackageSelect = useCallback(
    (pkg: Package) => {
      if (session.packageId === pkg.id) {
        clearPackage()
        setBookingTotal(laneReservationCents)
        return
      }
      const result = calculatePackageStepTotal({
        package: pkg,
        bowlerCount: session.bowlerCount!,
        selectedOptionalAddonIds: [],
      })
      setPackage(pkg, result.totalAmount)
    },
    [
      clearPackage,
      laneReservationCents,
      session.bowlerCount,
      session.packageId,
      setBookingTotal,
      setPackage,
    ],
  )

  const handleNext = useCallback(() => {
    if (!holdValid) return
    if (session.selectedPackage == null) {
      setBookingTotal(pricing.totalAmount)
    }
    router.push('/book/details')
  }, [holdValid, pricing.totalAmount, router, session.selectedPackage, setBookingTotal])

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

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

  const packageCtaLabel = holdValid
    ? 'Continue to contact info →'
    : 'Hold expired — return to date & time'

  useEffect(() => {
    if (session.selectedPackage == null && holdValid) {
      setBookingTotal(pricing.totalAmount)
    }
  }, [holdValid, pricing.totalAmount, session.selectedPackage, setBookingTotal])

  const needsHold = session.timeSlotId == null

  useEffect(() => {
    if (needsHold) router.replace('/book')
  }, [needsHold, router])

  if (needsHold) {
    return null
  }

  const footer = (
    <BookingFlowFooter
      ctaLabel={packageCtaLabel}
      onCta={handleNext}
      ctaDisabled={!holdValid}
      back={BOOKING_BACK_BY_STEP[2]}
    />
  )

  return (
    <BookingFlowShell
      venueName={tenant.name}
      address={tenant.address}
      currentStep={2}
      holdExpiresAt={session.holdExpiresAt}
      onHoldExpire={handleHoldExpired}
      footer={footer}
    >
      <BookingFlowLead
        title="Add a package"
        subtitle={packageSubtitle}
      />

      <p className="text-xs text-[var(--color-text-secondary)]">
        Open bowling by default — lane reservation only. Tap a package below to
        add one, or continue without selecting.
      </p>

      <PackageListToolbar resultCount={packages.length} />

      <div className="flex flex-col gap-3">
        {packagesPending
          ? Array.from({ length: 3 }, (_, i) => (
              <PackageCardSkeleton key={`pkg-sk-${i}`} />
            ))
          : packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={session.packageId === pkg.id}
                onSelect={handlePackageSelect}
                onOpenDetails={setDetailPkg}
              />
            ))}
      </div>

      {session.selectedPackage != null ? (
        <PackageAddonSection
          pkg={session.selectedPackage}
          selectedOptionalAddonIds={session.selectedOptionalAddonIds}
          onToggleOptionalAddon={toggleOptionalAddon}
        />
      ) : null}

      <PackageDetailSheet
        pkg={detailPkg}
        open={detailPkg != null}
        onClose={() => {
          setDetailPkg(null)
        }}
        onSelectThisPackage={(pkg) => {
          handlePackageSelect(pkg)
          setDetailPkg(null)
        }}
      />

    </BookingFlowShell>
  )
}
