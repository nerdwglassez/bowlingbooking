'use client'

// SchedulePanel — calendar + list views, day detail, and block sheet.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
} from 'lucide-react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import {
  ScheduleBlockForm,
  type ScheduleBlockFormValues,
} from '@/components/patterns/schedule-block-form'
import { ScheduleBlocksList } from '@/components/patterns/schedule-blocks-list'
import { ScheduleDayDetail } from '@/components/patterns/schedule-day-detail'
import { ScheduleMonthCalendar } from '@/components/patterns/schedule-month-calendar'
import { Button } from '@/components/ui/button'
import type {
  BlockedSlotRow,
  ScheduleDaySummary,
  StaffBookingRow,
} from '@/lib/actions/staff'
import { blockLanes, unblockLanes } from '@/lib/actions/staff'
import {
  formatCalendarMonthTitle,
} from '@/lib/booking-display'
import {
  isoDateLocal,
  monthParam,
  parseMonthParam,
} from '@/lib/schedule-display'

export type ScheduleView = 'calendar' | 'list'

export type SchedulePanelProps = {
  tenantId: string
  totalLanes: number
  month: string
  selectedDate: string
  todayISO: string
  view: ScheduleView
  monthDays: ScheduleDaySummary[]
  monthBlocks: BlockedSlotRow[]
  dayBookings: StaffBookingRow[]
  dayBlocks: BlockedSlotRow[]
  canManageBlocks: boolean
}

function scheduleHref(opts: {
  month: string
  date: string
  view: ScheduleView
}): string {
  const params = new URLSearchParams()
  params.set('month', opts.month)
  params.set('date', opts.date)
  if (opts.view === 'list') params.set('view', 'list')
  return `/staff/schedule?${params.toString()}`
}

function defaultBlockValues(dateISO: string): ScheduleBlockFormValues {
  return {
    scope: 'lanes',
    lanes: [],
    reason: '',
    date: dateISO,
    startTime: '16:00',
    endTime: '18:00',
    allDay: false,
  }
}

function blockToFormValues(
  block: BlockedSlotRow,
  dateISO: string,
): ScheduleBlockFormValues {
  const allDay =
    block.startTime.getHours() === 0 &&
    block.startTime.getMinutes() === 0 &&
    block.endTime.getHours() >= 23
  return {
    scope: block.lanes.length === 0 ? 'venue' : 'lanes',
    lanes: block.lanes,
    reason: block.reason ?? '',
    date: dateISO,
    startTime: `${String(block.startTime.getHours()).padStart(2, '0')}:${String(block.startTime.getMinutes()).padStart(2, '0')}`,
    endTime: `${String(block.endTime.getHours()).padStart(2, '0')}:${String(block.endTime.getMinutes()).padStart(2, '0')}`,
    allDay,
  }
}

export function SchedulePanel({
  tenantId,
  totalLanes,
  month,
  selectedDate,
  todayISO,
  view,
  monthDays,
  monthBlocks,
  dayBookings,
  dayBlocks,
  canManageBlocks,
}: SchedulePanelProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [formValues, setFormValues] = useState(() =>
    defaultBlockValues(selectedDate),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [navPending, startNav] = useTransition()

  const { year, month: monthIndex } = parseMonthParam(
    month,
    new Date(`${selectedDate}T12:00:00`),
  )
  const monthTitle = formatCalendarMonthTitle(year, monthIndex)

  const listBlocks = useMemo(() => {
    return monthBlocks.filter((block) => {
      const startMonth = block.startTime.getFullYear() * 12 + block.startTime.getMonth()
      const endMonth = block.endTime.getFullYear() * 12 + block.endTime.getMonth()
      const current = year * 12 + monthIndex
      return startMonth <= current && endMonth >= current
    })
  }, [monthBlocks, year, monthIndex])

  function navigate(next: { month?: string; date?: string; view?: ScheduleView }) {
    startNav(() => {
      router.push(
        scheduleHref({
          month: next.month ?? month,
          date: next.date ?? selectedDate,
          view: next.view ?? view,
        }),
      )
    })
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, monthIndex + delta, 1)
    navigate({ month: monthParam(d.getFullYear(), d.getMonth()) })
  }

  function openBlockSheet(dateISO?: string, existing?: BlockedSlotRow) {
    const date = dateISO ?? selectedDate
    setFormValues(
      existing ? blockToFormValues(existing, date) : defaultBlockValues(date),
    )
    setFormError(null)
    setSheetOpen(true)
  }

  function handleBlockSubmit() {
    setFormError(null)
    const lanes =
      formValues.scope === 'venue' ? [] : formValues.lanes
    if (formValues.scope === 'lanes' && lanes.length === 0) {
      setFormError('Select at least one lane.')
      return
    }
    if (!formValues.reason.trim()) {
      setFormError('Enter a reason for this block.')
      return
    }

    let start: Date
    let end: Date
    if (formValues.allDay) {
      start = new Date(`${formValues.date}T00:00:00`)
      end = new Date(`${formValues.date}T23:59:59`)
    } else {
      start = new Date(`${formValues.date}T${formValues.startTime}:00`)
      end = new Date(`${formValues.date}T${formValues.endTime}:00`)
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setFormError('Provide valid times.')
      return
    }
    if (end <= start) {
      setFormError('End must be after start.')
      return
    }

    startSubmit(async () => {
      try {
        await blockLanes({
          tenantId,
          startTime: start,
          endTime: end,
          lanes,
          reason: formValues.reason.trim(),
        })
        setSheetOpen(false)
        router.refresh()
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Could not create block.',
        )
      }
    })
  }

  function handleUnblock(blockId: string) {
    setUnblockingId(blockId)
    startSubmit(async () => {
      try {
        await unblockLanes(blockId)
        router.refresh()
      } finally {
        setUnblockingId(null)
      }
    })
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">Schedule</h1>
        <ViewToggle
          view={view}
          onChange={(next) => navigate({ view: next })}
        />
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <div className="w-full md:max-w-[480px] md:shrink-0">
          <div className="flex items-center justify-between px-1 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Previous month"
              disabled={navPending}
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="text-lg [font-family:var(--font-display)] text-[var(--color-text-primary)]">
              {monthTitle}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Next month"
              disabled={navPending}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>

          {view === 'calendar' ? (
            <ScheduleMonthCalendar
              year={year}
              month={monthIndex}
              days={monthDays}
              selectedDate={selectedDate}
              todayISO={todayISO}
              onSelectDate={(dateISO) => navigate({ date: dateISO })}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {canManageBlocks ? (
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="border-[color-mix(in_srgb,var(--status-error-border)_20%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_8%,transparent)] text-[var(--status-error-text)]"
                  onClick={() => openBlockSheet()}
                >
                  <Plus className="size-3" aria-hidden />
                  Add block
                </Button>
              ) : null}
              <ScheduleBlocksList
                blocks={listBlocks}
                canManageBlocks={canManageBlocks}
                onSelectBlock={
                  canManageBlocks
                    ? (id) => {
                        const block = listBlocks.find((b) => b.id === id)
                        if (block) openBlockSheet(isoDateLocal(block.startTime), block)
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {view === 'calendar' ? (
          <div className="min-w-0 flex-1">
            <ScheduleDayDetail
              dateISO={selectedDate}
              bookings={dayBookings}
              blocks={dayBlocks}
              canManageBlocks={canManageBlocks}
              onAddBlock={() => openBlockSheet(selectedDate)}
              onUnblock={canManageBlocks ? handleUnblock : undefined}
              unblockingId={unblockingId}
            />
          </div>
        ) : null}
      </div>

      <BottomSheet
        open={sheetOpen}
        title="Add block"
        onClose={() => setSheetOpen(false)}
      >
        <ScheduleBlockForm
          values={formValues}
          totalLanes={totalLanes}
          onChange={setFormValues}
          onSubmit={handleBlockSubmit}
          onCancel={() => setSheetOpen(false)}
          submitting={submitting}
          error={formError}
        />
      </BottomSheet>
    </>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ScheduleView
  onChange: (view: ScheduleView) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <ViewIconButton
        active={view === 'calendar'}
        label="Calendar view"
        onClick={() => onChange('calendar')}
      >
        <CalendarDays className="size-3.5" strokeWidth={1.8} aria-hidden />
      </ViewIconButton>
      <ViewIconButton
        active={view === 'list'}
        label="Blocked times list"
        onClick={() => onChange('list')}
      >
        <List className="size-3.5" strokeWidth={1.8} aria-hidden />
      </ViewIconButton>
    </div>
  )
}

function ViewIconButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 items-center justify-center rounded-[var(--radius-md)] border border-solid transition-opacity ${
        active
          ? 'border-[color-mix(in_srgb,var(--color-action)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-action)_12%,transparent)] text-[var(--color-action)]'
          : 'border-[var(--color-border-strong)] text-[var(--color-text-secondary)] opacity-45'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
