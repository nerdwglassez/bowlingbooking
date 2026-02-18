'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

interface BookingInfo {
  id: string
  token: string | null
  date: string
  startTime: string
  duration: number
  lane: number
  lanes: number[]
  numBowlers: number
  customerName: string
  status: string
}

export default function KioskCheckInPage() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams?.get('token') ?? ''

  const [inputCode, setInputCode] = useState('')
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ lanes: number[] } | null>(null)

  const fetchBooking = useCallback(async (token: string) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('token', token)
      const res = await fetch(`/api/kiosk/check-in?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Booking not found')
        setBooking(null)
        return
      }
      setBooking(data)
    } catch {
      setError('Could not load booking')
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tokenFromUrl) {
      fetchBooking(tokenFromUrl)
    } else {
      setBooking(null)
      setError(null)
    }
  }, [tokenFromUrl, fetchBooking])

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    const code = inputCode.trim().toUpperCase()
    if (!code) return
    fetchBooking(code)
  }

  const handleCheckIn = async () => {
    if (!booking?.token) {
      setError('Missing check-in token for this booking')
      return
    }
    setCheckingIn(true)
    setError(null)
    try {
      const res = await fetch('/api/kiosk/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: booking.token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Check-in failed')
        return
      }
      setSuccess({ lanes: data.lanes || [booking.lane] })
      setBooking(null)
      setInputCode('')
    } catch {
      setError('Check-in failed')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleReset = () => {
    setBooking(null)
    setSuccess(null)
    setError(null)
    setInputCode('')
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {success ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">You&apos;re checked in!</h1>
            <p className="text-2xl text-slate-300 mb-8">
              Lane{success.lanes.length > 1 ? 's' : ''} {success.lanes.join(', ')}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xl px-8 py-4 rounded-2xl bg-slate-700 hover:bg-slate-600 transition"
            >
              Check in another
            </button>
          </div>
        ) : !booking ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Self-service check-in</h1>
            <p className="text-slate-400 text-lg mb-8">Scan your QR code or enter your confirmation code</p>
            <form onSubmit={handleLookup} className="flex flex-col gap-4 items-center">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter code"
                className="w-full max-w-md text-xl text-slate-900 px-6 py-5 rounded-xl text-center font-mono tracking-wider"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="text-xl px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition font-semibold"
              >
                {loading ? 'Looking up…' : 'Find booking'}
              </button>
            </form>
            {error && <p className="mt-6 text-red-400 text-lg">{error}</p>}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-6">Confirm check-in</h2>
            <dl className="space-y-4 text-left max-w-md mx-auto mb-8">
              <div>
                <dt className="text-slate-400 text-sm">Guest</dt>
                <dd className="text-xl font-medium">{booking.customerName}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-sm">Date & time</dt>
                <dd className="text-xl font-medium">
                  {format(new Date(booking.date), 'EEE, MMM d')} at {booking.startTime}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 text-sm">Lane{booking.lanes.length > 1 ? 's' : ''}</dt>
                <dd className="text-xl font-medium">{booking.lanes.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-sm">Party size</dt>
                <dd className="text-xl font-medium">{booking.numBowlers} bowler{booking.numBowlers !== 1 ? 's' : ''}</dd>
              </div>
            </dl>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="text-2xl px-12 py-5 rounded-2xl bg-green-600 hover:bg-green-500 disabled:opacity-50 transition font-bold"
              >
                {checkingIn ? 'Checking in…' : 'Check in'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xl px-8 py-4 rounded-2xl bg-slate-700 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
