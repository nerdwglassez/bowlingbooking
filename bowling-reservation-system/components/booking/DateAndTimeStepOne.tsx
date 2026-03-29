'use client'

import { useState, useEffect, useRef, type CSSProperties } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  parse,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns'
import { Calendar, CalendarX, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { COLORS } from '@/lib/design-tokens'

/** Spec: 3 skeleton rectangles, pulse 0.5→1→0.5, 1.5s loop. Figma 19-1058: time list height 480px. */
function TimeSlotsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] sm:max-h-[400px] lg:max-h-[480px] overflow-hidden pr-1"
      aria-busy="true"
      aria-label="Loading times"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-12 min-h-[48px] w-full rounded-[12px] step1-skeleton-pulse"
          style={{ background: COLORS.bgInput, border: `2px solid ${COLORS.borderDefault}` }}
        />
      ))}
    </div>
  )
}

interface TimeSlot {
  time: string
  available: boolean
  availableLanes: number
}

interface DateAndTimeStepOneProps {
  selectedDate: string
  selectedTime: string
  onDateSelect: (date: string) => void
  onTimeSelect: (date: string, time: string) => void
  minLanes?: number
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}:00 ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  return format(d, 'EEE, MMM d')
}

export default function DateAndTimeStepOne({
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  minLanes = 1,
}: DateAndTimeStepOneProps) {
  const today = startOfDay(new Date())
  // Booking window: can only schedule up to 2 months in advance; can view 3 months ahead (current + 2 more)
  const maxBookableDate = endOfMonth(addMonths(today, 2))
  const maxViewMonth = startOfMonth(addMonths(today, 2))
  const minViewMonth = startOfMonth(today)

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const d = parse(selectedDate, 'yyyy-MM-dd', new Date())
      const month = startOfMonth(d)
      // Clamp to viewable range
      if (isBefore(month, minViewMonth)) return minViewMonth
      if (isAfter(month, maxViewMonth)) return maxViewMonth
      return month
    }
    return minViewMonth
  })
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const timeSlotsSectionRef = useRef<HTMLDivElement>(null)
  // Figma 136-6895: mobile step 1 – date collapsed, time expanded on load
  const [mobileDateExpanded, setMobileDateExpanded] = useState(false)
  const [mobileTimeExpanded, setMobileTimeExpanded] = useState(true)

  useEffect(() => {
    if (!selectedDate) {
      const clearId = setTimeout(() => {
        setSlots([])
        setSlotsError(null)
        setLoadingSlots(false)
      }, 0)
      return () => clearTimeout(clearId)
    }
    const loadId = setTimeout(() => {
      setSlots([])
      setLoadingSlots(true)
      setSlotsError(null)
      fetch(`/api/availability?date=${encodeURIComponent(selectedDate)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.slots) throw new Error(data.error || 'Failed to load')
          setSlots(data.slots || [])
        })
        .catch((err) => {
          setSlotsError(err instanceof Error ? err.message : 'Failed to load times')
          setSlots([])
        })
        .finally(() => setLoadingSlots(false))
    }, 0)
    return () => clearTimeout(loadId)
  }, [selectedDate])

  // Keep viewMonth within the 3-month view window (e.g. after midnight or long-lived session)
  useEffect(() => {
    const id = setTimeout(() => {
      if (isBefore(viewMonth, minViewMonth)) setViewMonth(minViewMonth)
      else if (isAfter(viewMonth, maxViewMonth)) setViewMonth(maxViewMonth)
    }, 0)
    return () => clearTimeout(id)
  }, [minViewMonth, maxViewMonth, viewMonth])

  // Spec: after time slots load, scroll to bring time slots into view (smooth, ~500ms)
  useEffect(() => {
    if (!loadingSlots && selectedDate && slots.length > 0 && timeSlotsSectionRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) return
      try {
        timeSlotsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {
        // Fallback for older browsers that only support boolean scrollIntoView.
        timeSlotsSectionRef.current.scrollIntoView(true)
      }
    }
  }, [loadingSlots, selectedDate, slots.length])

  const month1 = viewMonth

  /** Build calendar cells for one month: leading empty slots + dates in that month only. No next/previous month dates. */
  const buildCalendarCells = (month: Date): (Date | null)[] => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const firstDow = start.getDay()
    const leading: null[] = Array(firstDow).fill(null)
    const days = eachDayOfInterval({ start, end })
    return [...leading, ...days]
  }

  const cells1 = buildCalendarCells(month1)

  const isDateSelectable = (d: Date) =>
    !isBefore(d, today) && !isAfter(d, maxBookableDate)

  const handleDayClick = (d: Date) => {
    if (!isDateSelectable(d)) return
    onDateSelect(format(d, 'yyyy-MM-dd'))
  }

  const slotAvailableForLanes = (slot: TimeSlot) =>
    slot.available && slot.availableLanes >= minLanes

  const getLanesLabel = (slot: TimeSlot) => {
    if (!slotAvailableForLanes(slot)) return 'Full'
    return `${slot.availableLanes} lanes left`
  }

  const getLanesLabelStyle = (slot: TimeSlot): CSSProperties => {
    if (!slotAvailableForLanes(slot)) return {} // Full: slot uses fill_L5Y3OA #F8FAFC
    if (slot.availableLanes >= 8) return { color: '#10B981' } // fill_W8XKVU available
    if (slot.availableLanes >= 3) return { color: '#F59E0B' } // fill_BQYLSB limited
    return { color: '#0F172A' }
  }

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 transition-all duration-300 gap-6 lg:gap-11"
    >
      {/* Figma 136-6895: mobile collapsible date card; desktop unchanged */}
      <div
        className="flex flex-col min-h-0 lg:min-h-[600px] overflow-hidden"
        style={{
          gap: 32,
          padding: 'clamp(20px, 5vw, 33px)',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Mobile: collapsible header row (Figma 136-6918) – date collapsed on load */}
        <button
          type="button"
          onClick={() => {
              setMobileTimeExpanded(false)
              setMobileDateExpanded((v) => !v)
            }}
          className="flex w-full items-center justify-between gap-3 px-0 py-0 lg:hidden text-left"
          aria-expanded={mobileDateExpanded}
          aria-controls="step1-date-content"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}
            >
              <Calendar className="h-5 w-5" stroke="#6366F1" aria-hidden />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold leading-[24px] tracking-[-0.2px]" style={{ fontSize: 16, color: '#0F172A' }}>
                Select a date
              </span>
              <span className="font-semibold leading-[21px]" style={{ fontSize: 14, color: selectedDate ? '#6366F1' : '#94A3B8' }}>
                {selectedDate ? formatDateLabel(selectedDate) : 'Pick a date'}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`h-6 w-6 flex-shrink-0 transition-transform duration-200 ${mobileDateExpanded ? 'rotate-180' : ''}`}
            style={{ color: '#64748B' }}
            aria-hidden
          />
        </button>
        {/* Desktop: title + month nav */}
        <div className="hidden lg:flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}
            >
              <Calendar className="h-5 w-5" stroke="#0F172A" aria-hidden />
            </div>
            <span className="font-semibold leading-[1.5em]" style={{ fontSize: 20, color: '#0F172A' }}>
              Select a date
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              disabled={viewMonth <= minViewMonth}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" stroke="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              disabled={viewMonth >= maxViewMonth}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" stroke="currentColor" />
            </button>
          </div>
        </div>
        {/* Calendar content: visible when expanded on mobile, always on desktop */}
        <div
          id="step1-date-content"
          className={`grid grid-cols-1 gap-4 ${!mobileDateExpanded ? 'hidden lg:grid' : ''}`}
        >
          {/* Figma 19-381: Table Head layout_XNWDBV borderRadius 8px style_U59GVB fill_NTNHT5 #717182; Row layout_4VUHV9 40px */}
          <div>
            <p className="mb-2 text-center font-medium leading-[1.5em]" style={{ fontSize: 14, color: '#0F172A' }}>
              {format(month1, 'MMMM yyyy')}
            </p>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1" style={{ borderRadius: 8, fontSize: 12.8, color: '#717182', lineHeight: 1.5 }}>{w}</div>
              ))}
              {cells1.map((cell, i) => {
                if (cell === null) {
                  return <div key={`1-${i}-empty`} className="h-10 min-h-[40px]" aria-hidden />
                }
                const dateStr = format(cell, 'yyyy-MM-dd')
                const isSelected = selectedDate === dateStr
                const isDisabled = !isDateSelectable(cell)
                return (
                  <div
                    key={`1-${i}-${dateStr}`}
                    className="flex h-10 items-center justify-center"
                    style={{ borderRadius: 8, background: isSelected ? '#FFFFFF' : 'transparent' }}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(cell)}
                      disabled={isDisabled}
                      className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full text-base transition-[transform,opacity,color,background] duration-200 ease-out hover:scale-[1.02] motion-reduce:hover:scale-100 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2"
                      style={{
                        opacity: isDisabled ? 0.5 : 1,
                        color: isSelected ? '#FFFFFF' : '#0A0A0A',
                        background: isSelected
                          ? 'linear-gradient(166deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                          : 'transparent',
                      }}
                    >
                      {format(cell, 'd')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right card: Figma 136-6895 mobile collapsible time card; desktop unchanged */}
      <div
        className="flex flex-col min-h-0 lg:min-h-[600px] transition-all duration-300 overflow-hidden"
        style={{
          gap: 32,
          padding: 'clamp(20px, 5vw, 33px)',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Mobile: collapsible header row (Figma 136-6931) – time expanded on load */}
        <button
          type="button"
          onClick={() => {
              setMobileDateExpanded(false)
              setMobileTimeExpanded((v) => !v)
            }}
          className="flex w-full items-center justify-between gap-3 px-0 py-0 lg:hidden text-left"
          aria-expanded={mobileTimeExpanded}
          aria-controls="step1-time-content"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}
            >
              <Clock className="h-5 w-5" stroke="#6366F1" aria-hidden />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold leading-[24px] tracking-[-0.2px]" style={{ fontSize: 16, color: '#0F172A' }}>
                Select a time
              </span>
              <span className="font-normal leading-[21px]" style={{ fontSize: 14, color: selectedTime ? '#6366F1' : '#94A3B8' }}>
                {selectedTime ? formatTimeLabel(selectedTime) : 'Choose a time slot'}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`h-6 w-6 flex-shrink-0 transition-transform duration-200 ${mobileTimeExpanded ? 'rotate-180' : ''}`}
            style={{ color: '#64748B' }}
            aria-hidden
          />
        </button>
        {/* Desktop: title only */}
        <div className="hidden lg:flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)' }}
          >
            <Clock className="h-5 w-5" stroke="#0F172A" aria-hidden />
          </div>
          <span className="font-semibold leading-[1.5em]" style={{ fontSize: 20, color: '#0F172A' }}>
            Select a time
          </span>
        </div>
        <div id="step1-time-content" className={!mobileTimeExpanded ? 'hidden lg:!block' : ''}>
        {!selectedDate ? (
          <p className="py-8 text-center text-sm" style={{ color: COLORS.textSecondary }}>
            Select a date to see available times
          </p>
        ) : loadingSlots ? (
          <TimeSlotsSkeleton />
        ) : slotsError ? (
          <div className="py-6 text-center">
            <p className="mb-2 text-sm" style={{ color: COLORS.error }}>{slotsError}</p>
            <button
              type="button"
              onClick={() => {
                setSlotsError(null)
                setSlots([])
                setLoadingSlots(true)
                fetch(`/api/availability?date=${encodeURIComponent(selectedDate)}`)
                  .then((res) => res.json())
                  .then((data) => {
                    if (!data.slots) throw new Error(data.error || 'Failed to load')
                    setSlots(data.slots || [])
                  })
                  .catch((err) => {
                    setSlotsError(err instanceof Error ? err.message : 'Failed to load times')
                    setSlots([])
                  })
                  .finally(() => setLoadingSlots(false))
              }}
              className="text-sm font-medium hover:underline"
              style={{ color: '#6366F1' }}
            >
              Try again
            </button>
          </div>
        ) : slots.length === 0 ? (
          /* Spec: No availability – CalendarX 48px red, "No availability", message, light red bg, red border, fade-in 300ms */
          <div
            className="rounded-xl border-2 px-4 py-6 text-center"
            style={{
              borderColor: COLORS.error,
              background: '#FEF2F2',
              animation: 'step1-stagger-fade-up 0.3s ease-out',
            }}
            role="alert"
          >
            <CalendarX
              className="mx-auto mb-2"
              style={{ width: 48, height: 48 }}
              stroke={COLORS.error}
              aria-hidden
            />
            <p className="font-semibold text-[#0F172A] mb-1">No availability</p>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              All time slots are booked for this date. Please select another date.
            </p>
          </div>
        ) : (
          <div
            ref={timeSlotsSectionRef}
            className="step-content-enter grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[320px] sm:max-h-[400px] lg:max-h-[480px] overflow-y-auto pr-1"
            style={{ scrollMarginTop: 100 }}
          >
            {slots.map((slot, index) => {
              const isSelected = selectedTime === slot.time
              const canSelect = slotAvailableForLanes(slot)
              const isFull = !slotAvailableForLanes(slot)
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => {
                    if (canSelect) {
                      onTimeSelect(selectedDate, slot.time)
                      setMobileTimeExpanded(false)
                    }
                  }}
                  disabled={!canSelect}
                  className={`relative flex w-full min-h-[56px] items-center justify-between rounded-[12px] border-2 px-4 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none
                    ${canSelect ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2' : 'cursor-not-allowed'}
                    ${canSelect && !isSelected ? 'hover:scale-[1.02] hover:border-[#6366F1]/40 hover:shadow-md' : ''}
                    ${isSelected ? 'hover:scale-[1.01] hover:shadow-lg' : ''}`}
                  style={{
                    borderColor: isSelected ? 'transparent' : '#E2E8F0',
                    background: isFull
                      ? '#F8FAFC'
                      : isSelected
                        ? 'linear-gradient(166deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)'
                        : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : '#0F172A',
                    opacity: isFull ? 0.5 : 0,
                    animation: isFull ? undefined : 'step1-stagger-fade-up 0.3s ease-out forwards',
                    animationDelay: isFull ? undefined : `${index * 50}ms`,
                  }}
                >
                  <span className="font-normal leading-[24px]" style={{ fontSize: 16 }}>
                    {formatTimeLabel(slot.time)}
                  </span>
                  <span
                    className={`text-right text-[12px] leading-[18px] whitespace-nowrap pl-3 ${isFull ? 'font-medium' : 'font-semibold'}`}
                    style={isSelected ? { color: 'rgba(255,255,255,0.9)' } : getLanesLabelStyle(slot)}
                  >
                    {getLanesLabel(slot)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
