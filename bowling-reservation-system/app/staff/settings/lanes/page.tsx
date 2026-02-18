'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import Toast from '@/components/ui/Toast'

type SettingsPayload = {
  canEdit: boolean
  settings: {
    laneRentalPerHour: number
    bowlerPricePerPerson: number
    shoeRental: number
    taxRate: number
    totalLanes: number
    reserveLanes: number
  }
}

export default function StaffLanesSettingsPage() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const response = await fetch('/api/staff/settings', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load lane settings')
        const data = (await response.json()) as SettingsPayload
        if (mounted) setPayload(data)
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : 'Failed to load lane settings')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const save = async () => {
    if (!payload) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/staff/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.settings),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to save lane settings')
      }
      setSuccessToast('Lane settings updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save lane settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Lane Configuration</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set the total number of bowling lanes and reserve lanes for in-person bookings.
      </p>

      {loading || !payload ? (
        <p className="mt-6 text-sm text-slate-500">Loading lane settings...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Total Number of Lanes
              <input
                type="number"
                min={1}
                max={50}
                value={payload.settings.totalLanes}
                disabled={!payload.canEdit}
                onChange={(event) =>
                  setPayload((prev) =>
                    prev
                      ? { ...prev, settings: { ...prev.settings, totalLanes: Math.min(50, Math.max(1, Number(event.target.value) || 1)) } }
                      : prev
                  )
                }
                className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5"
              />
              <p className="mt-1 text-xs text-slate-500">Maximum 50 lanes allowed</p>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Reserved Lanes (Unavailable for Online Booking)
              <input
                type="number"
                min={0}
                value={payload.settings.reserveLanes}
                disabled={!payload.canEdit}
                onChange={(event) =>
                  setPayload((prev) =>
                    prev
                      ? { ...prev, settings: { ...prev.settings, reserveLanes: Math.max(0, Number(event.target.value) || 0) } }
                      : prev
                  )
                }
                className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5"
              />
              <p className="mt-1 text-xs text-slate-500">
                {Math.max(0, payload.settings.totalLanes - payload.settings.reserveLanes)} lanes available for online reservations
              </p>
            </label>
          </div>

          {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}
          <Toast
            message={successToast ?? ''}
            visible={!!successToast}
            onDismiss={() => setSuccessToast(null)}
            variant="success"
            autoDismissMs={3000}
          />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!payload.canEdit || saving}
              className="inline-flex items-center gap-2 rounded-[14px] bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" aria-hidden />
              {saving ? 'Saving...' : payload.canEdit ? 'Save Changes' : 'Read-only access'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
