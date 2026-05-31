import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { StaffReportsPeriod } from '@/lib/reports-display'

export type ReportsPeriodChipsProps = {
  period: StaffReportsPeriod
  customStart?: string
  customEnd?: string
  view: 'analytics' | 'contacts'
  draftStart: string
  draftEnd: string
  onDraftStartChange: (value: string) => void
  onDraftEndChange: (value: string) => void
}

const PERIODS: { value: StaffReportsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
]

function buildHref(
  period: StaffReportsPeriod,
  view: 'analytics' | 'contacts',
  customStart?: string,
  customEnd?: string,
): string {
  const params = new URLSearchParams()
  if (view === 'contacts') params.set('view', 'contacts')
  if (period !== 'month') params.set('period', period)
  if (period === 'custom' && customStart && customEnd) {
    params.set('start', customStart)
    params.set('end', customEnd)
  }
  const qs = params.toString()
  return qs ? `/staff/reports?${qs}` : '/staff/reports'
}

export function ReportsPeriodChips({
  period,
  customStart,
  customEnd,
  view,
  draftStart,
  draftEnd,
  onDraftStartChange,
  onDraftEndChange,
}: ReportsPeriodChipsProps) {
  const canApplyCustom = draftStart.length > 0 && draftEnd.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label="Report period"
      >
        {PERIODS.map((p) => {
          const active = period === p.value
          return (
            <Link
              key={p.value}
              href={buildHref(
                p.value,
                view,
                p.value === 'custom' ? customStart : undefined,
                p.value === 'custom' ? customEnd : undefined,
              )}
              scroll={false}
              className={`shrink-0 rounded-[var(--radius-full)] border-[1.5px] border-solid px-3 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-[var(--color-action)] bg-[var(--color-action-subtle)] text-[var(--color-action-dark)]'
                  : 'border-[var(--color-border-strong)] bg-[var(--surface-card)] text-[var(--color-text-muted)]'
              }`}
            >
              {p.label}
            </Link>
          )
        })}
      </div>

      {period === 'custom' ? (
        <div className="flex flex-col gap-2 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Start
              <Input
                type="date"
                value={draftStart}
                onChange={(e) => onDraftStartChange(e.target.value)}
                className="text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              End
              <Input
                type="date"
                value={draftEnd}
                onChange={(e) => onDraftEndChange(e.target.value)}
                className="text-sm"
              />
            </label>
          </div>
          <Button
            asChild
            variant="secondary"
            size="sm"
            disabled={!canApplyCustom}
            className={canApplyCustom ? '' : 'pointer-events-none opacity-50'}
          >
            <Link
              href={
                canApplyCustom
                  ? buildHref('custom', view, draftStart, draftEnd)
                  : '#'
              }
              scroll={false}
            >
              Apply
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
