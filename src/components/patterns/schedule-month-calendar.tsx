'use client'

// ScheduleMonthCalendar — month grid with density bars and block indicators.
// Controlled pattern — no useState.

import type {
  ScheduleBlockLevel,
  ScheduleDaySummary,
} from '@/lib/actions/staff'
import { buildMonthGrid } from '@/lib/schedule-display'

export type ScheduleMonthCalendarProps = {
  year: number
  month: number
  days: ScheduleDaySummary[]
  selectedDate: string
  todayISO: string
  onSelectDate: (dateISO: string) => void
}

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

function daySummary(
  days: ScheduleDaySummary[],
  dateISO: string,
): ScheduleDaySummary | undefined {
  return days.find((d) => d.dateISO === dateISO)
}

function densityFillClass(level: ScheduleDaySummary['densityLevel']): string {
  switch (level) {
    case 'full':
      return 'bg-[var(--status-error-text)]'
    case 'busy':
      return 'bg-[var(--color-action)]'
    default:
      return 'bg-[var(--status-ok-text)]'
  }
}

function cellBlockClass(blockLevel: ScheduleBlockLevel): string {
  switch (blockLevel) {
    case 'full':
      return 'border border-solid border-[var(--status-error-border)] bg-[color-mix(in_srgb,var(--status-error-bg)_12%,transparent)]'
    case 'partial':
      return 'border border-solid border-[color-mix(in_srgb,var(--status-error-border)_15%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_7%,transparent)]'
    default:
      return ''
  }
}

export function ScheduleMonthCalendar({
  year,
  month,
  days,
  selectedDate,
  todayISO,
  onSelectDate,
}: ScheduleMonthCalendarProps) {
  const cells = buildMonthGrid(year, month)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-0.5">
        {DOW.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const summary = daySummary(days, cell.dateISO)
          const isSelected = selectedDate === cell.dateISO
          const isToday = todayISO === cell.dateISO
          const blockLevel = summary?.blockLevel ?? 'none'
          const densityPercent = summary?.densityPercent ?? 0
          const densityLevel = summary?.densityLevel ?? 'low'
          const showBlockDot =
            blockLevel === 'partial' || blockLevel === 'full'

          let cellClass =
            'relative flex aspect-square flex-col items-center justify-start rounded-[var(--radius-sm)] px-0.5 pb-1 pt-1 transition-colors'

          if (!cell.inMonth) {
            cellClass += ' opacity-20'
          } else if (isSelected) {
            cellClass += ' bg-[var(--color-action)]'
          } else {
            cellClass += ` hover:bg-[var(--surface-elevated)] ${cellBlockClass(blockLevel)}`
            if (isToday) {
              cellClass +=
                ' border border-solid border-[color-mix(in_srgb,var(--color-action)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-action)_8%,transparent)]'
            }
          }

          return (
            <button
              key={`${cell.dateISO}-${cell.inMonth}`}
              type="button"
              className={cellClass}
              onClick={() => {
                if (cell.inMonth) onSelectDate(cell.dateISO)
              }}
              aria-label={cell.dateISO}
              aria-pressed={isSelected}
            >
              <span
                className={`text-[11px] font-semibold leading-none ${
                  isSelected
                    ? 'text-[var(--color-text-on-action)]'
                    : isToday
                      ? 'text-[var(--color-action)]'
                      : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {cell.day}
              </span>
              {cell.inMonth && densityPercent > 0 ? (
                <span
                  className={`mt-0.5 h-[3px] w-[calc(100%-4px)] overflow-hidden rounded-[2px] ${
                    isSelected
                      ? 'bg-[color-mix(in_srgb,var(--color-text-on-action)_20%,transparent)]'
                      : 'bg-[var(--color-border)]'
                  }`}
                >
                  <span
                    className={`block h-full rounded-[2px] transition-[width] duration-300 ${densityFillClass(densityLevel)} ${
                      isSelected ? '!bg-[var(--color-text-on-action)]' : ''
                    }`}
                    style={{ width: `${densityPercent}%` }}
                  />
                </span>
              ) : cell.inMonth ? (
                <span className="mt-0.5 h-[3px] w-[calc(100%-4px)] rounded-[2px] bg-[var(--color-border)]" />
              ) : null}
              {showBlockDot && cell.inMonth && !isSelected ? (
                <span
                  className="absolute bottom-0.5 right-0.5 size-1 rounded-full bg-[var(--status-error-text)]"
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-1 pt-2">
        <LegendSwatch className="bg-[var(--status-ok-text)]" label="Available" />
        <LegendSwatch className="bg-[var(--color-action)]" label="Busy" />
        <LegendSwatch
          className="bg-[var(--status-error-text)]"
          label="Full"
        />
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-[var(--status-error-text)]" />
          <span className="text-[9px] text-[var(--color-text-secondary)]">
            Blocked
          </span>
        </span>
      </div>
    </div>
  )
}

function LegendSwatch({
  className,
  label,
}: {
  className: string
  label: string
}) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-[3px] w-5 rounded-[2px] ${className}`} />
      <span className="text-[9px] text-[var(--color-text-secondary)]">
        {label}
      </span>
    </span>
  )
}
