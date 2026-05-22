'use client'

// BookingContext.tsx — Multi-step booking form state.
//
// Lives at app/(customer)/book/layout.tsx. Pages read via useBooking().
// All setters use cascading invalidation: changing an upstream field wipes
// dependent downstream selections so the user can't end up with a stale hold
// or mismatched package.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BookingSession, Package, TimeSlot } from '@/types'
import { validatePromoCode } from '@/lib/actions/promo'
import { getLaneCount } from '@/lib/lane-logic'

const DEFAULT_BOWLER_COUNT = 1

const defaultSession: BookingSession = {
  partyType: null,
  bowlerCount: DEFAULT_BOWLER_COUNT,
  laneCount: getLaneCount(DEFAULT_BOWLER_COUNT),
  date: null,
  timeSlotId: null,
  startTime: null,
  endTime: null,
  holdId: null,
  holdExpiresAt: null,
  packageId: null,
  selectedPackage: null,
  totalAmount: null,
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  stripeClientSecret: null,
  stripePaymentIntentId: null,
  promoCode: null,
}

export interface CustomerInfoUpdate {
  name?: string
  email?: string
  phone?: string
}

interface BookingContextValue {
  session: BookingSession
  setBowlerCount: (n: number) => void
  setDate: (date: string) => void
  setTimeSlot: (
    slot: TimeSlot | null,
    hold: { id: string; expiresAt: Date } | null,
  ) => void
  setPackage: (pkg: Package, totalAmount: number) => void
  setCustomerInfo: (update: CustomerInfoUpdate) => void
  setPaymentIntent: (clientSecret: string, paymentIntentId: string) => void
  applyPromoCode: (code: string) => Promise<void>
  clearPromoCode: () => void
  resetSession: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({
  children,
  tenantId,
}: {
  children: ReactNode
  tenantId: string
}) {
  const [session, setSession] = useState<BookingSession>(defaultSession)
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  function setBowlerCount(n: number) {
    setSession((prev) => ({
      ...prev,
      bowlerCount: n,
      laneCount: getLaneCount(n),
      timeSlotId: null,
      startTime: null,
      endTime: null,
      holdId: null,
      holdExpiresAt: null,
      packageId: null,
      selectedPackage: null,
      partyType: null,
      totalAmount: null,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
      promoCode: null,
    }))
  }

  function setDate(date: string) {
    setSession((prev) => ({
      ...prev,
      date,
      timeSlotId: null,
      startTime: null,
      endTime: null,
      holdId: null,
      holdExpiresAt: null,
      packageId: null,
      selectedPackage: null,
      partyType: null,
      totalAmount: null,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
      promoCode: null,
    }))
  }

  function setTimeSlot(
    slot: TimeSlot | null,
    hold: { id: string; expiresAt: Date } | null,
  ) {
    setSession((prev) => ({
      ...prev,
      timeSlotId: slot?.id ?? null,
      startTime: slot?.startTime ?? null,
      endTime: slot?.endTime ?? null,
      holdId: hold?.id ?? null,
      holdExpiresAt: hold?.expiresAt ?? null,
      packageId: null,
      selectedPackage: null,
      partyType: null,
      totalAmount: null,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
      promoCode: null,
    }))
  }

  function setPackage(pkg: Package, totalAmount: number) {
    setSession((prev) => ({
      ...prev,
      packageId: pkg.id,
      selectedPackage: pkg,
      partyType: pkg.partyTypes[0] ?? null,
      totalAmount,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
      promoCode: null,
    }))
  }

  function setCustomerInfo(update: CustomerInfoUpdate) {
    setSession((prev) => ({
      ...prev,
      customerName: update.name ?? prev.customerName,
      customerEmail: update.email ?? prev.customerEmail,
      customerPhone: update.phone ?? prev.customerPhone,
    }))
  }

  function setPaymentIntent(clientSecret: string, paymentIntentId: string) {
    setSession((prev) => ({
      ...prev,
      stripeClientSecret: clientSecret,
      stripePaymentIntentId: paymentIntentId,
    }))
  }

  async function applyPromoCode(code: string) {
    const subtotal = sessionRef.current.totalAmount
    if (subtotal == null) {
      throw new Error('Select a package first')
    }
    const result = await validatePromoCode(tenantId, code, subtotal)
    setSession((prev) => ({ ...prev, promoCode: result }))
  }

  function clearPromoCode() {
    setSession((prev) => ({
      ...prev,
      promoCode: null,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
    }))
  }

  function resetSession() {
    setSession(defaultSession)
  }

  return (
    <BookingContext.Provider
      value={{
        session,
        setBowlerCount,
        setDate,
        setTimeSlot,
        setPackage,
        setCustomerInfo,
        setPaymentIntent,
        applyPromoCode,
        clearPromoCode,
        resetSession,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
