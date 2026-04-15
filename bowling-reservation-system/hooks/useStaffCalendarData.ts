'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  filterCalendarBookingsByQuery,
  getCalendarGridDays,
  groupBookingsByDate,
  type StaffCalendarBooking,
} from '@/lib/staff/calendar'

export function useStaffCalendarData() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [monthBookings, setMonthBookings] = useState<StaffCalendarBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const loadMonthBookings = useCallback(async (month: Date) => {
    setLoading(true)
    try {
      const from = format(startOfMonth(month), 'yyyy-MM-dd')
      const to = format(endOfMonth(month), 'yyyy-MM-dd')
      const response = await fetch(
        `/api/staff/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        {
          cache: 'no-store',
        }
      )
      if (!response.ok) throw new Error('Failed to load calendar bookings')
      const data = await response.json()
      setMonthBookings(data.bookings ?? [])
    } catch (error) {
      console.error(error)
      setMonthBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMonthBookings(visibleMonth)
  }, [visibleMonth, loadMonthBookings])

  const calendarDays = useMemo(() => getCalendarGridDays(visibleMonth), [visibleMonth])
  const bookingsByDate = useMemo(() => groupBookingsByDate(monthBookings), [monthBookings])
  const selectedDayBookings = useMemo(() => {
    const items = bookingsByDate.get(selectedDate) ?? []
    return filterCalendarBookingsByQuery(items, query)
  }, [bookingsByDate, selectedDate, query])

  return {
    visibleMonth,
    setVisibleMonth,
    selectedDate,
    setSelectedDate,
    loading,
    query,
    setQuery,
    calendarDays,
    bookingsByDate,
    selectedDayBookings,
  }
}
