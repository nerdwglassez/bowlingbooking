'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildStaffDashboardStats,
  filterStaffDashboardBookings,
  type StaffDashboardBooking,
  type StaffDashboardStats,
  type StaffDashboardStatusFilter,
} from '@/lib/staff/dashboard'

const DEFAULT_STATS: StaffDashboardStats = {
  bookingsToday: 0,
  availableLanes: 0,
  checkingInSoon: 0,
  revenueToday: 0,
}

export function useStaffDashboardData() {
  const [todayBookings, setTodayBookings] = useState<StaffDashboardBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffDashboardStatusFilter>('all')
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null)
  const [stats, setStats] = useState<StaffDashboardStats>(DEFAULT_STATS)

  const loadTodayBookings = useCallback(async () => {
    try {
      setLoadError(null)
      const response = await fetch('/api/staff/bookings/today', { credentials: 'include' })
      const text = await response.text()
      if (!response.ok) {
        let detail = `Request failed (${response.status})`
        try {
          const body = JSON.parse(text) as { error?: string }
          if (typeof body.error === 'string') detail = body.error
        } catch {
          if (text.trim()) detail = text.trim().slice(0, 200)
        }
        throw new Error(detail)
      }
      const data = JSON.parse(text) as { bookings?: StaffDashboardBooking[] }
      const bookings = data.bookings || []
      setTodayBookings(bookings)
      setStats(buildStaffDashboardStats(bookings))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings'
      setLoadError(message)
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTodayBookings()
  }, [loadTodayBookings])

  useEffect(() => {
    const handleBookingUpdated = () => {
      void loadTodayBookings()
    }
    window.addEventListener('staff:booking-updated', handleBookingUpdated)
    return () => window.removeEventListener('staff:booking-updated', handleBookingUpdated)
  }, [loadTodayBookings])

  const filteredBookings = useMemo(
    () => filterStaffDashboardBookings(todayBookings, query, statusFilter),
    [todayBookings, query, statusFilter]
  )

  return {
    loading,
    loadError,
    stats,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    filteredBookings,
    openActionsForId,
    setOpenActionsForId,
    refreshBookings: loadTodayBookings,
  }
}
