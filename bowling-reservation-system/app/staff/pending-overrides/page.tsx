'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatTime12Hour } from '@/lib/time'

interface Booking {
  id: string
  date: string
  startTime: string
  totalPrice: number
  proposedTotalPrice: number | null
  proposedReasonCode: string | null
  proposedNotes: string | null
  proposedAt: string | null
  user: { email: string; firstName: string | null; lastName: string | null }
}

export default function PendingOverridesPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/staff/pending-overrides')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Pending price overrides</h1>
      <p className="text-sm text-slate-500 mb-6">
        Bookings where staff proposed a price change. Approve or reject from the booking detail page.
      </p>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center text-sm text-slate-600">
          No pending overrides
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Proposed</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
                      {format(new Date(b.date), 'MMM d, yyyy')} at {formatTime12Hour(b.startTime)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {[b.user.firstName, b.user.lastName].filter(Boolean).join(' ').trim() || b.user.email}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">${Number(b.totalPrice).toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium text-amber-700">
                    ${b.proposedTotalPrice != null ? Number(b.proposedTotalPrice).toFixed(2) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {b.proposedReasonCode ?? '—'}
                    {b.proposedNotes && ` · ${b.proposedNotes}`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/staff/bookings/${b.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View & approve
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
