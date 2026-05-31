'use client'

// WalkInGuestStep — step 1: source, guest, bowlers (walkin-booking-flow.html).

import { Input } from '@/components/ui/input'
import {
  formatBowlerLaneHint,
  type WalkInBookingSource,
} from '@/lib/walk-in-display'

export type WalkInGuestStepValues = {
  source: WalkInBookingSource
  customerName: string
  customerEmail: string
  bowlerCount: number
  scheduledStart: string
}

export type WalkInGuestStepProps = {
  values: WalkInGuestStepValues
  onChange: (next: WalkInGuestStepValues) => void
  onNext: () => void
}

const SOURCES: { value: WalkInBookingSource; label: string }[] = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'advance', label: 'Advance' },
]

export function WalkInGuestStep({
  values,
  onChange,
  onNext,
}: WalkInGuestStepProps) {
  function patch(update: Partial<WalkInGuestStepValues>) {
    onChange({ ...values, ...update })
  }

  const showSchedule = values.source !== 'walk_in'
  const canNext = values.customerName.trim().length > 0 && values.bowlerCount >= 1

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Source
        </span>
        <div className="flex gap-1.5">
          {SOURCES.map((opt) => {
            const active = values.source === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className={`flex-1 rounded-[var(--radius-md)] border-[1.5px] border-solid px-1.5 py-2 text-center text-[11px] font-semibold ${
                  active
                    ? 'border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action-subtle)_10%,transparent)] text-[var(--color-action-dark)]'
                    : 'border-[var(--color-border-strong)] bg-[var(--surface-raised)] text-[var(--color-text-secondary)]'
                }`}
                onClick={() => patch({ source: opt.value })}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Guest name
        </span>
        <Input
          value={values.customerName}
          onChange={(e) => patch({ customerName: e.target.value })}
          placeholder="First name or group name"
          className="border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] px-3 py-2.5 text-[13px]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Email{' '}
          <span className="normal-case font-normal">— optional</span>
        </span>
        <Input
          type="email"
          value={values.customerEmail}
          onChange={(e) => patch({ customerEmail: e.target.value })}
          placeholder="For confirmation email"
          className="border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] px-3 py-2.5 text-[13px]"
        />
        <span className="text-[10px] text-[var(--color-text-secondary)]">
          Leave blank for guests without accounts.
        </span>
      </label>

      {showSchedule ? (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Start time
          </span>
          <Input
            type="datetime-local"
            value={values.scheduledStart}
            onChange={(e) => patch({ scheduledStart: e.target.value })}
            className="border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] px-3 py-2.5 text-[13px]"
          />
        </label>
      ) : null}

      <div>
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Bowler count
        </span>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] text-lg leading-none text-[var(--color-text-primary)]"
            aria-label="Decrease bowlers"
            onClick={() =>
              patch({ bowlerCount: Math.max(1, values.bowlerCount - 1) })
            }
          >
            −
          </button>
          <span className="min-w-9 text-center text-2xl [font-family:var(--font-display)] text-[var(--color-text-primary)]">
            {values.bowlerCount}
          </span>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] text-lg leading-none text-[var(--color-text-primary)]"
            aria-label="Increase bowlers"
            onClick={() => patch({ bowlerCount: values.bowlerCount + 1 })}
          >
            +
          </button>
          <span className="text-[11px] leading-snug text-[var(--color-text-secondary)]">
            bowlers
            <br />
            <span className="text-[9px]">
              {formatBowlerLaneHint(values.bowlerCount)}
            </span>
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canNext}
        className="mt-1 w-full rounded-[var(--radius-md)] bg-[var(--color-action)] px-3 py-3 text-[13px] font-semibold text-[var(--color-text-on-action)] disabled:cursor-not-allowed disabled:opacity-35"
        onClick={onNext}
      >
        Next — Package & lane →
      </button>
    </div>
  )
}
