'use client'

// BookingContext.tsx — Multi-step booking form state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BookingSession, Package, ShoeSelection, TimeSlot } from '@/types'
import { validatePromoCode } from '@/lib/actions/promo'
import { getLaneCount } from '@/lib/lane-logic'
import { calculatePackageStepTotal } from '@/lib/pricing'

const DEFAULT_BOWLER_COUNT = 2

function emptyShoeSelections(count: number): ShoeSelection[] {
  return Array.from({ length: count }, (_, i) => ({
    bowlerId: `bowler-${i + 1}`,
    size: '',
    cost: 0,
  }))
}

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
  shoeSelections: emptyShoeSelections(DEFAULT_BOWLER_COUNT),
  selectedOptionalAddonIds: [],
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
  clearPackage: () => void
  toggleOptionalAddon: (addonId: string) => void
  setShoeSelection: (bowlerIndex: number, size: string, cost: number) => void
  removeBowler: (index: number) => void
  syncShoeRows: () => void
  setBookingTotal: (totalAmount: number) => void
  setCustomerInfo: (update: CustomerInfoUpdate) => void
  setPaymentIntent: (clientSecret: string, paymentIntentId: string) => void
  clearPaymentIntent: () => void
  applyPromoCode: (code: string) => Promise<void>
  clearPromoCode: () => void
  resetSession: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

function downstreamClearFields() {
  return {
    packageId: null as string | null,
    selectedPackage: null as Package | null,
    partyType: null as BookingSession['partyType'],
    totalAmount: null as number | null,
    stripeClientSecret: null as string | null,
    stripePaymentIntentId: null as string | null,
    promoCode: null as BookingSession['promoCode'],
    shoeSelections: [] as ShoeSelection[],
    selectedOptionalAddonIds: [] as string[],
  }
}

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
      ...downstreamClearFields(),
      shoeSelections: emptyShoeSelections(n),
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
      ...downstreamClearFields(),
      shoeSelections: emptyShoeSelections(prev.bowlerCount ?? DEFAULT_BOWLER_COUNT),
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
      ...downstreamClearFields(),
      shoeSelections: emptyShoeSelections(prev.bowlerCount ?? DEFAULT_BOWLER_COUNT),
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
      shoeSelections: emptyShoeSelections(prev.bowlerCount ?? DEFAULT_BOWLER_COUNT),
      selectedOptionalAddonIds: [],
    }))
  }

  function clearPackage() {
    setSession((prev) => ({
      ...prev,
      packageId: null,
      selectedPackage: null,
      partyType: null,
      totalAmount: null,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
      promoCode: null,
      shoeSelections: emptyShoeSelections(prev.bowlerCount ?? DEFAULT_BOWLER_COUNT),
      selectedOptionalAddonIds: [],
    }))
  }

  function toggleOptionalAddon(addonId: string) {
    setSession((prev) => {
      if (prev.selectedPackage == null || prev.bowlerCount == null) {
        return prev
      }
      const selectedOptionalAddonIds = prev.selectedOptionalAddonIds.includes(
        addonId,
      )
        ? prev.selectedOptionalAddonIds.filter((id) => id !== addonId)
        : [...prev.selectedOptionalAddonIds, addonId]

      const pricing = calculatePackageStepTotal({
        package: prev.selectedPackage,
        bowlerCount: prev.bowlerCount,
        selectedOptionalAddonIds,
      })

      return {
        ...prev,
        selectedOptionalAddonIds,
        totalAmount: pricing.totalAmount,
        stripeClientSecret: null,
        stripePaymentIntentId: null,
        promoCode: null,
      }
    })
  }

  function setShoeSelection(bowlerIndex: number, size: string, cost: number) {
    setSession((prev) => {
      const next = [...prev.shoeSelections]
      const row = next[bowlerIndex]
      if (row == null) return prev
      next[bowlerIndex] = { ...row, size, cost }
      return { ...prev, shoeSelections: next }
    })
  }

  function removeBowler(index: number) {
    setSession((prev) => {
      const count = prev.bowlerCount ?? 1
      if (count <= 1) return prev
      const nextCount = count - 1
      const nextSelections = prev.shoeSelections.filter((_, i) => i !== index)
      return {
        ...prev,
        bowlerCount: nextCount,
        laneCount: getLaneCount(nextCount),
        shoeSelections: nextSelections.map((row, i) => ({
          ...row,
          bowlerId: `bowler-${i + 1}`,
        })),
        stripeClientSecret: null,
        stripePaymentIntentId: null,
        promoCode: null,
      }
    })
  }

  const syncShoeRows = useCallback(() => {
    setSession((prev) => {
      const count = prev.bowlerCount ?? DEFAULT_BOWLER_COUNT
      if (prev.shoeSelections.length === count) return prev
      return {
        ...prev,
        shoeSelections: emptyShoeSelections(count),
      }
    })
  }, [])

  const setBookingTotal = useCallback((totalAmount: number) => {
    setSession((prev) => {
      if (
        prev.totalAmount === totalAmount &&
        prev.stripeClientSecret == null &&
        prev.stripePaymentIntentId == null
      ) {
        return prev
      }
      return {
        ...prev,
        totalAmount,
        stripeClientSecret: null,
        stripePaymentIntentId: null,
        promoCode: null,
      }
    })
  }, [])

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

  function clearPaymentIntent() {
    setSession((prev) => ({
      ...prev,
      stripeClientSecret: null,
      stripePaymentIntentId: null,
    }))
  }

  async function applyPromoCode(code: string) {
    const subtotal = sessionRef.current.totalAmount
    if (subtotal == null || subtotal <= 0) {
      throw new Error('Add items to your booking before applying a promo code')
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
        clearPackage,
        toggleOptionalAddon,
        setShoeSelection,
        removeBowler,
        syncShoeRows,
        setBookingTotal,
        setCustomerInfo,
        setPaymentIntent,
        clearPaymentIntent,
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
