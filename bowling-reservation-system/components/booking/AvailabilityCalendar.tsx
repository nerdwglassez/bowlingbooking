'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import {
  getAvailabilityBandClassName,
  getAvailabilityLabel,
  isSlotAvailableForRequiredLanes,
} from '@/lib/booking/availability'
import { useAvailabilityForDate } from '@/hooks/useAvailabilityForDate'

interface AvailabilityCalendarProps {
  onTimeSelect?: (date: string, time: string) => void
  /** Called when user clicks a date pill (so parent can sync selected date). */
  onDateChange?: (date: string) => void
  selectedDate?: string
  selectedTime?: string
  /** Minimum lanes required (e.g. 2 for double-lane booking). Slots with fewer are shown unavailable. */
  minLanes?: number
  /** When true, do not show the "Select Date" label (e.g. when parent shows "Select a date" in a card). */
  hideDateLabel?: boolean
  /** Compact mode for dense modal flows (e.g. staff tablet dialogs). */
  compactDateWindow?: boolean
}

export default function AvailabilityCalendar({
  onTimeSelect,
  onDateChange,
  selectedDate,
  selectedTime,
  minLanes = 1,
  hideDateLabel = false,
  compactDateWindow = false,
}: AvailabilityCalendarProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [selectedDateState, setSelectedDateState] = useState(selectedDate || todayStr)
  const resolvedDate = selectedDate ?? selectedDateState
  const { slots, loading, error, loadAvailability } = useAvailabilityForDate(selectedDateState)

  const handleDateChange = (date: string) => {
    setSelectedDateState(date)
    onDateChange?.(date)
  }

  const handleTimeSelect = (time: string) => {
    if (onTimeSelect) {
      onTimeSelect(selectedDateState, time)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        {!hideDateLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: compactDateWindow ? 7 : 14 }, (_, i) => {
            const date = addDays(new Date(), i)
            const dateStr = format(date, 'yyyy-MM-dd')
            const isSelected = dateStr === resolvedDate
            const isToday = i === 0

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateChange(dateStr)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadAvailability(selectedDateState)}
              className="text-sm font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="text-center py-8 text-gray-500 space-y-1">
            <p>No available time slots for this date.</p>
            <p className="text-xs">Try another date, or ensure operating hours are set in Admin.</p>
          </div>
        )}

        {!loading && !error && slots.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {slots.map(slot => {
              const isSelected = selectedTime === slot.time
              const canSelect = isSlotAvailableForRequiredLanes(slot, minLanes) && onTimeSelect

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => canSelect && handleTimeSelect(slot.time)}
                  disabled={!isSlotAvailableForRequiredLanes(slot, minLanes)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                  } ${getAvailabilityBandClassName(slot, minLanes)}`}
                >
                  <div>{slot.time}</div>
                  <div className="text-xs mt-1">{getAvailabilityLabel(slot, minLanes)}</div>
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


