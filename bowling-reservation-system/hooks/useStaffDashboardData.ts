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
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StaffDashboardStatusFilter>('all')
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null)
  const [stats, setStats] = useState<StaffDashboardStats>(DEFAULT_STATS)

  const loadTodayBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/bookings/today')
      if (!response.ok) throw new Error('Failed to load bookings')
      const data = await response.json()
      const bookings = data.bookings || []
      setTodayBookings(bookings)
      setStats(buildStaffDashboardStats(bookings))
    } catch (err) {
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
