'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface OperatingHours {
  dayOfWeek: number
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
}

export default function OperatingHoursPage() {
  const [hours, setHours] = useState<OperatingHours[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHours()
  }, [])

  const loadHours = async () => {
    try {
      const response = await fetch('/api/admin/operating-hours')
      if (!response.ok) throw new Error('Failed to load hours')
      const data = await response.json()
      setHours(data.hours)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveDay = async (day: OperatingHours) => {
    setSaving(day.dayOfWeek)
    setError(null)

    try {
      const response = await fetch('/api/admin/operating-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(day),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      // Update the hours array
      setHours(prev => prev.map(h => h.dayOfWeek === day.dayOfWeek ? data.hours : h))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const updateDay = (dayOfWeek: number, updates: Partial<OperatingHours>) => {
    setHours(prev => {
      const existing = prev.find(h => h.dayOfWeek === dayOfWeek)
      if (existing) {
        return prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h)
      } else {
        return [...prev, { dayOfWeek, openTime: null, closeTime: null, isClosed: true, ...updates }]
      }
    })
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">Operating Hours</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {DAYS.map(day => {
            const dayHours = hours.find(h => h.dayOfWeek === day.value) || {
              dayOfWeek: day.value,
              openTime: null,
              closeTime: null,
              isClosed: true,
            }

            return (
              <div key={day.value} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">{day.label}</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!dayHours.isClosed}
                      onChange={(e) => {
                        updateDay(day.value, { isClosed: !e.target.checked })
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </label>
                </div>

                {!dayHours.isClosed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input
                      label="Open Time"
                      type="time"
                      value={dayHours.openTime || ''}
                      onChange={(e) => {
                        updateDay(day.value, { openTime: e.target.value || null })
                      }}
                    />
                    <Input
                      label="Close Time"
                      type="time"
                      value={dayHours.closeTime || ''}
                      onChange={(e) => {
                        updateDay(day.value, { closeTime: e.target.value || null })
                      }}
                    />
                  </div>
                )}

                <Button
                  onClick={() => saveDay(dayHours)}
                  isLoading={saving === day.value}
                  disabled={!dayHours.isClosed && (!dayHours.openTime || !dayHours.closeTime)}
                >
                  Save {day.label}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


