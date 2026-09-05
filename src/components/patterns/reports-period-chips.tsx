import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Report period">
        {PERIODS.map((p) => {
          const active = period === p.value
          return (
            <Button
              key={p.value}
              href={buildHref(
                p.value,
                view,
                p.value === 'custom' ? customStart : undefined,
                p.value === 'custom' ? customEnd : undefined,
              )}
              size="sm"
              color={active ? 'secondary' : 'tertiary'}
            >
              {p.label}
            </Button>
          )
        })}
      </div>

      {period === 'custom' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start"
              value={draftStart}
              onChange={onDraftStartChange}
            />
            <Input
              type="date"
              label="End"
              value={draftEnd}
              onChange={onDraftEndChange}
            />
          </div>
          {canApplyCustom ? (
            <Button
              href={buildHref('custom', view, draftStart, draftEnd)}
              color="secondary"
              size="sm"
            >
              Apply
            </Button>
          ) : (
            <Button color="secondary" size="sm" isDisabled>
              Apply
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
