'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface SpecialHoursRow {
  id: string
  date: string
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
}

export default function SpecialHoursPage() {
  const [hours, setHours] = useState<SpecialHoursRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formOpenTime, setFormOpenTime] = useState('09:00')
  const [formCloseTime, setFormCloseTime] = useState('22:00')
  const [formClosed, setFormClosed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const rangeStart = format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  const rangeEnd = format(addMonths(new Date(), 3), 'yyyy-MM-dd')

  useEffect(() => {
    loadHours()
  }, [])

  const loadHours = async () => {
    try {
      const res = await fetch(`/api/admin/special-hours?from=${rangeStart}&to=${rangeEnd}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setHours(data.hours)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/special-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          openTime: formClosed ? null : formOpenTime,
          closeTime: formClosed ? null : formCloseTime,
          isClosed: formClosed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setShowForm(false)
      loadHours()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('Remove this special hours override?')) return
    try {
      const res = await fetch(`/api/admin/special-hours/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadHours()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">Special Hours</h1>
      <p className="text-gray-600 mb-6">
        Override operating hours for specific dates (e.g. holidays, early close). These take precedence over regular weekly hours.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-600">Upcoming overrides</span>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add override'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">New special hours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formClosed}
                  onChange={(e) => setFormClosed(e.target.checked)}
                />
                <span className="text-sm">Closed</span>
              </label>
            </div>
            {!formClosed && (
              <>
                <Input
                  label="Open time"
                  type="time"
                  value={formOpenTime}
                  onChange={(e) => setFormOpenTime(e.target.value)}
                />
                <Input
                  label="Close time"
                  type="time"
                  value={formCloseTime}
                  onChange={(e) => setFormCloseTime(e.target.value)}
                />
              </>
            )}
          </div>
          <Button type="submit" isLoading={submitting}>Save</Button>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {hours.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No special hours in this range</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {hours.map((row) => (
              <div key={row.id} className="p-6 flex justify-between items-center">
                <div>
                  <p className="font-medium">{format(new Date(row.date), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-gray-600">
                    {row.isClosed
                      ? 'Closed'
                      : `${row.openTime} – ${row.closeTime}`}
                  </p>
                </div>
                <Button variant="danger" onClick={() => deleteRow(row.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
