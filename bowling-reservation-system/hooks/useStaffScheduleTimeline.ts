'use client'

import { useEffect, useState } from 'react'
import type { SchedulingConflict, TimelineEntry, TimelineSlot } from '@/lib/staff/scheduling'

type StaffScheduleTimeline = {
  startTime: string
  endTime: string
  slotMinutes: number
  slots: TimelineSlot[]
  entries: TimelineEntry[]
  conflicts: SchedulingConflict[]
}

type UseStaffScheduleTimelineOptions = {
  date: string
  enabled?: boolean
}

export function useStaffScheduleTimeline(options: UseStaffScheduleTimelineOptions) {
  const [timeline, setTimeline] = useState<StaffScheduleTimeline | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!options.enabled) {
      setTimeline(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/staff/schedule?date=${encodeURIComponent(options.date)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to load timeline')
        }
        const payload = await response.json()
        if (!cancelled) {
          setTimeline(payload.timeline ?? null)
        }
      } catch (err: unknown) {
        if (cancelled) return
        if (err instanceof Error && err.name === 'AbortError') return
        setTimeline(null)
        setError(err instanceof Error ? err.message : 'Failed to load timeline')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [options.date, options.enabled])

  return {
    timeline,
    loading,
    error,
  }
}
