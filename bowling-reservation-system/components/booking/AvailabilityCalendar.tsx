'use client'

import { useState, useEffect } from 'react'
import { format, addDays, parse } from 'date-fns'
import Button from '@/components/ui/Button'

interface TimeSlot {
  time: string
  available: boolean
  availableLanes: number
}

interface AvailabilityCalendarProps {
  onTimeSelect?: (date: string, time: string) => void
  selectedDate?: string
  selectedTime?: string
}

export default function AvailabilityCalendar({
  onTimeSelect,
  selectedDate,
  selectedTime,
}: AvailabilityCalendarProps) {
  const [selectedDateState, setSelectedDateState] = useState(
    selectedDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAvailability(selectedDateState)
  }, [selectedDateState])

  const loadAvailability = async (date: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/availability?date=${date}`)
      if (!response.ok) throw new Error('Failed to load availability')

      const data = await response.json()
      setSlots(data.slots || [])
    } catch (err: any) {
      setError(err.message)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const getAvailabilityColor = (slot: TimeSlot) => {
    if (!slot.available) return 'bg-gray-200 text-gray-400 cursor-not-allowed'
    if (slot.availableLanes >= 8) return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (slot.availableLanes >= 3) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    return 'bg-red-100 text-red-800 hover:bg-red-200'
  }

  const getAvailabilityLabel = (slot: TimeSlot) => {
    if (!slot.available) return 'Full'
    if (slot.availableLanes >= 8) return `${slot.availableLanes} lanes`
    if (slot.availableLanes >= 3) return `${slot.availableLanes} lanes`
    return `${slot.availableLanes} lane${slot.availableLanes > 1 ? 's' : ''}`
  }

  const handleDateChange = (date: string) => {
    setSelectedDateState(date)
  }

  const handleTimeSelect = (time: string) => {
    if (onTimeSelect) {
      onTimeSelect(selectedDateState, time)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 14 }, (_, i) => {
            const date = addDays(new Date(), i)
            const dateStr = format(date, 'yyyy-MM-dd')
            const isSelected = dateStr === selectedDateState
            const isToday = i === 0

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateChange(dateStr)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">
                  {format(date, 'EEE')}
                </div>
                <div className="text-xs">
                  {format(date, 'MMM d')}
                </div>
                {isToday && (
                  <div className="text-xs opacity-75">Today</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Available Time Slots
        </label>

        {loading && (
          <div className="text-center py-8 text-gray-500">Loading availability...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No available time slots for this date
          </div>
        )}

        {!loading && !error && slots.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {slots.map(slot => {
              const isSelected = selectedTime === slot.time
              const isClickable = slot.available && onTimeSelect

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => isClickable && handleTimeSelect(slot.time)}
                  disabled={!slot.available}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : ''
                  } ${getAvailabilityColor(slot)}`}
                >
                  <div>{slot.time}</div>
                  <div className="text-xs mt-1">{getAvailabilityLabel(slot)}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>8+ lanes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>3-7 lanes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>1-2 lanes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Full</span>
        </div>
      </div>
    </div>
  )
}


