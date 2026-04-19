'use client'

import { useCallback, useState } from 'react'

type GuestData = {
  email: string
  firstName: string
  lastName: string
  phone: string
}

type CreateBookingPayload = {
  date: string
  startTime: string
  duration: number
  numLanes: number
  lane?: number
  numBowlers: number
  shoeSizes: number[]
  packageIds: string[]
  productItems: Array<{ productId: string; quantity: number }>
  termsAccepted: boolean
  loyaltyPointsToRedeem?: number
  giftCardCode?: string
  giftCardAmountToApply?: number
  discountCode?: string
}

type UseBookingCheckoutFlowOptions = {
  onConfirmed: (bookingId: string) => void
}

export function useBookingCheckoutFlow({ onConfirmed }: UseBookingCheckoutFlowOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)

  const resetPaymentState = useCallback(() => {
    setPaymentClientSecret(null)
    setCreatedBookingId(null)
  }, [])

  const createBooking = useCallback(async (payload: CreateBookingPayload) => {
    if (!payload.date || !payload.startTime) {
      setError('Please select a date and time')
      return null
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      const bookingId = result.booking.id as string
      if (result.requiresPayment === false) {
        onConfirmed(bookingId)
        return { bookingId, requiresPayment: false as const }
      }

      const paymentRes = await fetch(`/api/bookings/${bookingId}/create-payment-intent`, {
        method: 'POST',
      })
      const paymentData = await paymentRes.json()

      if (paymentRes.status === 503 || !paymentData.clientSecret) {
        onConfirmed(bookingId)
        return { bookingId, requiresPayment: false as const }
      }

      setCreatedBookingId(bookingId)
      setPaymentClientSecret(paymentData.clientSecret as string)
      return { bookingId, requiresPayment: true as const }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      return null
    } finally {
      setLoading(false)
    }
  }, [onConfirmed])

  const confirmPayment = useCallback(async (paymentIntentId: string) => {
    if (!createdBookingId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${createdBookingId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to confirm payment')
      }
      onConfirmed(createdBookingId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }, [createdBookingId, onConfirmed])

  const registerGuestAndCreateBooking = useCallback(
    async (guestData: GuestData, payload: CreateBookingPayload) => {
      setLoading(true)
      setError(null)
      try {
        const guestResponse = await fetch('/api/auth/guest-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestData),
        })

        if (!guestResponse.ok) {
          const result = await guestResponse.json()
          throw new Error(result.error || 'Failed to create guest account')
        }

        // Keep original sequencing behavior for session cookie propagation.
        setTimeout(() => {
          createBooking(payload)
        }, 500)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create guest account')
        setLoading(false)
      }
    },
    [createBooking]
  )

  const createBookingAfterLogin = useCallback((payload: CreateBookingPayload) => {
    // Keep original sequencing behavior for session cookie propagation.
    setTimeout(() => {
      createBooking(payload)
    }, 500)
  }, [createBooking])

  return {
    loading,
    error,
    setError,
    paymentClientSecret,
    createdBookingId,
    createBooking,
    confirmPayment,
    resetPaymentState,
    registerGuestAndCreateBooking,
    createBookingAfterLogin,
  }
}
