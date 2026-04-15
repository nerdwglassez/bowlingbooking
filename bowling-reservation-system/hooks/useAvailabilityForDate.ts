'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AvailabilitySlot {
  time: string
  available: boolean
  availableLanes: number
}

type UseAvailabilityForDateOptions = {
  enabled?: boolean
}

export function useAvailabilityForDate(selectedDate: string, options?: UseAvailabilityForDateOptions) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enabled = options?.enabled ?? true

  const loadAvailability = useCallback(async (date: string) => {
    if (!date) {
      setSlots([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data.error as string) || 'Failed to load time slots')
      }
      setSlots(data.slots || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load time slots')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    loadAvailability(selectedDate)
  }, [selectedDate, loadAvailability, enabled])

  return {
    slots,
    loading,
    error,
    refetch: () => loadAvailability(selectedDate),
    loadAvailability,
  }
}
