'use client'

import { format, parse } from 'date-fns'

/**
 * Booking summary visible across steps. Desktop: sticky sidebar. Mobile: bottom-anchored bar.
 * Prevents layout shift with fixed min-height.
 * TODO: total price when backend provides it.
 * TODO: expandable details on mobile (tap to expand).
 * Parent must add padding-bottom on mobile (e.g. pb-24) so content is not hidden behind the bar.
 */
interface BookingSummaryBarProps {
  /** Current step (1–4). */
  step: number
  selectedDate: string
  selectedTime: string
  numBowlers: number
  numLanes: number
  durationMinutes?: number
  /** Package count or total for display. TODO: replace with actual total from backend. */
  packageCount?: number
  /** Optional total in cents. TODO: from pricing API. */
  totalCents?: number | null
}

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}:00 ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export default function BookingSummaryBar({
  step,
  selectedDate,
  selectedTime,
  numBowlers,
  numLanes,
  durationMinutes,
  packageCount = 0,
  totalCents = null,
}: BookingSummaryBarProps) {
  const hasDate = !!selectedDate
  const hasTime = !!selectedTime
  const dateLabel = hasDate
    ? format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEE, MMM d')
    : '—'
  const timeLabel = hasTime ? formatTimeLabel(selectedTime) : '—'

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside
        className="hidden lg:block w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-24"
        style={{ minHeight: 200 }}
        aria-label="Booking summary"
      >
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06),0px_1px_3px_0px_rgba(0,0,0,0.1)]"
          style={{ minHeight: 180 }}
        >
          <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Your booking</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[#717182]">Date</dt>
              <dd className="font-medium text-[#0F172A]">{dateLabel}</dd>
            </div>
            <div>
              <dt className="text-[#717182]">Time</dt>
              <dd
                className="font-medium text-[#0F172A] transition-opacity duration-300"
                style={{ opacity: hasTime ? 1 : 0.7 }}
              >
                {timeLabel}
              </dd>
            </div>
            {durationMinutes != null && durationMinutes > 0 && (
              <div>
                <dt className="text-[#717182]">Duration</dt>
                <dd className="font-medium text-[#0F172A]">
                  {durationMinutes >= 60 ? `${durationMinutes / 60} hr` : `${durationMinutes} min`}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[#717182]">Bowlers</dt>
              <dd className="font-medium text-[#0F172A]">{numBowlers}</dd>
            </div>
            <div>
              <dt className="text-[#717182]">Lanes</dt>
              <dd className="font-medium text-[#0F172A]">{numLanes}</dd>
            </div>
            {packageCount > 0 && (
              <div>
                <dt className="text-[#717182]">Packages</dt>
                <dd className="font-medium text-[#0F172A]">{packageCount}</dd>
              </div>
            )}
          </dl>
          {totalCents != null && totalCents >= 0 && (
            <p
              className="mt-3 pt-3 border-t border-[#E2E8F0] text-base font-semibold text-[#0F172A] rounded-lg"
              style={hasTime ? { animation: 'step1-summary-highlight 0.6s ease-out 1' } : undefined}
            >
              {/* TODO: format currency from backend */}
              ${(totalCents / 100).toFixed(2)}
            </p>
          )}
        </div>
      </aside>

      {/* Mobile: bottom-anchored summary bar (expandable details TODO) */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm px-4 py-3 safe-area-pb"
        style={{ minHeight: 56 }}
        aria-label="Booking summary"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#717182]">
            {dateLabel} · {timeLabel}
          </span>
          <span className="font-medium text-[#0F172A]">
            {numBowlers} bowler{numBowlers !== 1 ? 's' : ''} · {numLanes} lane{numLanes !== 1 ? 's' : ''}
          </span>
        </div>
        {totalCents != null && totalCents >= 0 && (
          <p className="text-right text-xs text-[#717182] mt-0.5">
            Total ${(totalCents / 100).toFixed(2)}
          </p>
        )}
      </div>
    </>
  )
}
