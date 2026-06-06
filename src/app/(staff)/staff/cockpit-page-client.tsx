'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback } from 'react'

import { BookingDetailSheet } from '@/components/chrome/booking-detail-sheet'
import { CockpitPanel, type CockpitPanelProps } from './cockpit-panel'

function CockpitPageInner(
  props: CockpitPanelProps & { canRefund: boolean },
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')

  const openBooking = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('booking', id)
      router.push(`/staff?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const closeSheet = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('booking')
    const qs = params.toString()
    router.push(qs ? `/staff?${qs}` : '/staff', { scroll: false })
  }, [router, searchParams])

  return (
    <>
      <CockpitPanel {...props} onOpenBooking={openBooking} />
      <BookingDetailSheet
        bookingId={bookingId}
        tenantId={props.tenantId}
        bowlersPerLane={props.bowlersPerLane}
        open={Boolean(bookingId)}
        onClose={closeSheet}
        canRefund={props.canRefund}
      />
    </>
  )
}

export function CockpitPageClient(
  props: CockpitPanelProps & { canRefund: boolean },
) {
  return (
    <Suspense fallback={<CockpitPanel {...props} />}>
      <CockpitPageInner {...props} />
    </Suspense>
  )
}
