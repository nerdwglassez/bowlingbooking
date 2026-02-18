'use client'

import { useEffect, useMemo, useState } from 'react'
import Toast from '@/components/ui/Toast'

type OperatingHour = {
  dayOfWeek: number
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

const DEFAULT_HOURS: OperatingHour[] = DAY_LABELS.map((_, dayOfWeek) => ({
  dayOfWeek,
  openTime: '10:00',
  closeTime: '22:00',
  isClosed: false,
}))

export default function StaffOperatingHoursPage() {
  const [hours, setHours] = useState<OperatingHour[]>(DEFAULT_HOURS)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const orderedHours = useMemo(
    () => [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [hours]
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/staff/settings', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load operating hours')
        const data = (await response.json()) as { canEdit: boolean; operatingHours: OperatingHour[] }
        if (!mounted) return

        setCanEdit(data.canEdit)
        if (data.operatingHours.length === 7) {
          setHours(data.operatingHours)
        }
      } catch {
        if (mounted) setMessage('Unable to load current operating hours.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const updateHour = (dayOfWeek: number, patch: Partial<OperatingHour>) => {
    setHours((prev) => prev.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, ...patch } : entry)))
  }

  const saveHours = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/staff/settings/operating-hours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: orderedHours }),
      })
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || 'Failed to save operating hours')
      }
      setSuccessToast('Operating hours updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save operating hours.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Operating Hours</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set your bowling alley&apos;s operating hours for each day of the week.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading operating hours...</p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {orderedHours.map((entry) => (
              <div
                key={entry.dayOfWeek}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:justify-start">
                  <p className="font-medium text-slate-900 sm:w-28">{DAY_LABELS[entry.dayOfWeek]}</p>
                  <label className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={entry.isClosed}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateHour(entry.dayOfWeek, {
                          isClosed: event.target.checked,
                          openTime: event.target.checked ? null : entry.openTime || '10:00',
                          closeTime: event.target.checked ? null : entry.closeTime || '22:00',
                        })
                      }
                      className="rounded border-slate-300"
                    />
                    Closed
                  </label>
                </div>

                {!entry.isClosed ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <input
                      type="time"
                      className="rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      value={entry.openTime ?? '10:00'}
                      disabled={!canEdit}
                      onChange={(event) => updateHour(entry.dayOfWeek, { openTime: event.target.value })}
                      aria-label={`${DAY_LABELS[entry.dayOfWeek]} open time`}
                    />
                    <span className="text-sm text-slate-500">to</span>
                    <input
                      type="time"
                      className="rounded-[14px] border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      value={entry.closeTime ?? '22:00'}
                      disabled={!canEdit}
                      onChange={(event) => updateHour(entry.dayOfWeek, { closeTime: event.target.value })}
                      aria-label={`${DAY_LABELS[entry.dayOfWeek]} close time`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Closed</span>
                )}
              </div>
            ))}
          </div>

          {message ? (
            <p className="mt-4 text-sm text-rose-600">{message}</p>
          ) : null}
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
              onClick={() => void saveHours()}
              disabled={!canEdit || saving}
              className="rounded-[14px] bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving...' : canEdit ? 'Save Changes' : 'Read-only access'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
