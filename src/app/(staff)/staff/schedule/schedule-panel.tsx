'use client'

// SchedulePanel — calendar + list views, day detail, and block sheet.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus } from '@untitledui/icons'

import { CalendarDateIcon } from '@/components/application/calendar/base-components/calendar-date-icon'
import { CalendarViewDropdown } from '@/components/application/calendar/base-components/calendar-view-dropdown'
import { Badge } from '@/components/base/badges/badges'
import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group'
import { Button } from '@/components/base/buttons/button'
import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import {
  ScheduleBlockForm,
  type ScheduleBlockFormValues,
} from '@/components/patterns/schedule-block-form'
import { ScheduleBlocksList } from '@/components/patterns/schedule-blocks-list'
import { ScheduleDayDetail } from '@/components/patterns/schedule-day-detail'
import { ScheduleMonthCalendar } from '@/components/patterns/schedule-month-calendar'
import { ScheduleReservationDetail } from '@/components/patterns/schedule-reservation-detail'
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
  weekOfMonth,
} from '@/lib/schedule-display'
import { runStaffAction } from '@/lib/refresh-after-action'

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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  )
  const [formValues, setFormValues] = useState(() =>
    defaultBlockValues(selectedDate),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [navPending, startNav] = useTransition()

  const { year, month: monthIndex } = parseMonthParam(
    month,
    new Date(`${selectedDate}T12:00:00`),
  )
  const monthTitle = formatCalendarMonthTitle(year, monthIndex)
  const selectedBooking = dayBookings.find((b) => b.id === selectedBookingId)

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
    setEditingBlockId(existing?.id ?? null)
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

    runStaffAction({
      startTransition: startSubmit,
      action: () =>
        blockLanes({
          tenantId,
          startTime: start,
          endTime: end,
          lanes,
          reason: formValues.reason.trim(),
        }),
      onSuccess: () => setSheetOpen(false),
      onError: (err) => {
        setFormError(
          err instanceof Error ? err.message : 'Could not create block.',
        )
      },
      refresh: () => router.refresh(),
    })
  }

  function handleUnblock(blockId: string) {
    setUnblockingId(blockId)
    runStaffAction({
      startTransition: startSubmit,
      action: () => unblockLanes(blockId),
      onSuccess: () => setUnblockingId(null),
      onError: () => setUnblockingId(null),
      refresh: () => router.refresh(),
    })
  }

  return (
    <>
      <StaffPageHeader title={view === 'list' ? 'Reservation List' : 'Schedule'} />

      {view === 'calendar' ? (
        <div className="flex flex-col overflow-hidden rounded-xl bg-primary shadow-xs ring ring-secondary">
          <div className="relative flex flex-col items-start justify-between gap-4 bg-primary px-4 py-5 md:px-6 lg:flex-row">
            <div className="flex items-start gap-3">
              <CalendarDateIcon
                day={Number(selectedDate.slice(8, 10))}
                month={new Date(`${selectedDate}T12:00:00`)
                  .toLocaleString('en-US', { month: 'short' })
                  .toUpperCase()}
                className="max-md:hidden"
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                  {monthTitle}
                  <Badge size="sm" color="gray" type="modern">
                    Week {weekOfMonth(selectedDate)}
                  </Badge>
                </div>
                <span className="text-sm text-tertiary">
                  {new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' – '}
                  {new Date(year, monthIndex + 1, 0).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 gap-y-4 max-lg:w-full">
              <ButtonGroup
                selectedKeys={[]}
                size="sm"
                className="flex max-lg:order-last max-lg:min-w-full max-lg:flex-1"
              >
                <ButtonGroupItem
                  id="prev"
                  iconLeading={ArrowLeft}
                  aria-label="Previous month"
                  isDisabled={navPending}
                  onClick={() => shiftMonth(-1)}
                />
                <ButtonGroupItem
                  id="today"
                  className="flex-1 justify-center text-center"
                  isDisabled={navPending}
                  onClick={() => {
                    const d = new Date()
                    navigate({
                      month: monthParam(d.getFullYear(), d.getMonth()),
                      date: isoDateLocal(d),
                    })
                  }}
                >
                  Today
                </ButtonGroupItem>
                <ButtonGroupItem
                  id="next"
                  iconLeading={ArrowRight}
                  aria-label="Next month"
                  isDisabled={navPending}
                  onClick={() => shiftMonth(1)}
                />
              </ButtonGroup>
              <CalendarViewDropdown
                value="month"
                onSelectionChange={() => undefined}
                options={[{ value: 'month', label: 'Month view' }]}
              />
              {canManageBlocks ? (
                <Button
                  iconLeading={Plus}
                  size="sm"
                  onPress={() => openBlockSheet(selectedDate)}
                >
                  Block
                </Button>
              ) : null}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 w-full border-t border-secondary" />
          </div>

          <ScheduleMonthCalendar
            year={year}
            month={monthIndex}
            days={monthDays}
            selectedDate={selectedDate}
            todayISO={todayISO}
            onSelectDate={(dateISO) => {
              setSelectedBookingId(null)
              navigate({ date: dateISO })
            }}
            onAddBlock={
              canManageBlocks
                ? (dateISO) => openBlockSheet(dateISO)
                : undefined
            }
          />

          <div className="border-t border-secondary px-4 py-5 md:px-6">
            <ScheduleDayDetail
              dateISO={selectedDate}
              bookings={dayBookings}
              blocks={dayBlocks}
              canManageBlocks={canManageBlocks}
              onSelectBooking={(id) => setSelectedBookingId(id)}
              onSelectBlock={
                canManageBlocks
                  ? (id) => {
                      const block = dayBlocks.find((b) => b.id === id)
                      if (block) {
                        openBlockSheet(isoDateLocal(block.startTime), block)
                      }
                    }
                  : undefined
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {canManageBlocks ? (
            <Button
              type="button"
              color="primary-destructive"
              iconLeading={Plus}
              onClick={() => openBlockSheet()}
            >
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

      <BottomSheet
        open={selectedBookingId != null}
        title={selectedBooking?.customerName ?? 'Reservation'}
        onClose={() => setSelectedBookingId(null)}
      >
        {selectedBooking ? (
          <ScheduleReservationDetail booking={selectedBooking} />
        ) : (
          <p className="text-sm text-tertiary">Nothing scheduled for this day.</p>
        )}
      </BottomSheet>

      <BottomSheet
        open={sheetOpen}
        title={editingBlockId ? 'Edit block' : 'Add block'}
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
        {editingBlockId ? (
          <Button
            type="button"
            color="tertiary"
            className="mt-2"
            isLoading={unblockingId === editingBlockId}
            onClick={() => {
              handleUnblock(editingBlockId)
              setSheetOpen(false)
            }}
          >
            Remove block
          </Button>
        ) : null}
      </BottomSheet>
    </>
  )
}
