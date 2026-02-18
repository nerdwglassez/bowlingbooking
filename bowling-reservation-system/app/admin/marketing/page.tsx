'use client'

import { useState, useEffect } from 'react'

interface Segments {
  postVisitPending: number
  lapsedEligible: number
  cronUrl: string
}

export default function AdminMarketingPage() {
  const [segments, setSegments] = useState<Segments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/marketing/segments')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setSegments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!segments) return null

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">Marketing Automation</h1>
      <p className="text-gray-600 mb-6">
        Triggered campaigns run via cron. Post-visit emails go 24h after a completed booking; lapsed-customer emails go to opted-in customers with no booking in the last 30 days (throttled to once per 28 days).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Post-visit (thanks for coming)</h2>
          <p className="text-3xl font-bold text-blue-600">{segments.postVisitPending}</p>
          <p className="text-sm text-gray-500 mt-1">Completed bookings (last 3 days) not yet sent</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Lapsed customers (we miss you)</h2>
          <p className="text-3xl font-bold text-amber-600">{segments.lapsedEligible}</p>
          <p className="text-sm text-gray-500 mt-1">Newsletter opted-in, no booking in 30 days</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">Cron setup</h2>
        <p className="text-sm text-gray-600 mb-2">
          Call this URL on a schedule (e.g. hourly). Use <code className="bg-gray-200 px-1 rounded">CRON_SECRET</code> in env and send it as <code className="bg-gray-200 px-1 rounded">Authorization: Bearer &lt;CRON_SECRET&gt;</code> or <code className="bg-gray-200 px-1 rounded">x-cron-secret</code> header.
        </p>
        <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
          GET {typeof window !== 'undefined' ? window.location.origin : ''}{segments.cronUrl}
        </pre>
        <p className="text-xs text-gray-500 mt-2">
          Vercel: add to vercel.json crons, e.g. <code className="bg-gray-200 px-1 rounded">&quot;schedule&quot;: &quot;0 * * * *&quot;</code> (hourly).
        </p>
      </div>
    </div>
  )
}
