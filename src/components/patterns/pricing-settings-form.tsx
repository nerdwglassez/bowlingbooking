'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatPrice, formatPriceInputValue, parsePriceInputValue } from '@/lib/pricing'

export type PricingStrategy =
  | 'per_person_hour'
  | 'per_lane_hour'
  | 'per_person_game'
  | 'packages_only'

export interface PricingSettingsFormValues {
  strategy: PricingStrategy
  defaultRateCents: number
  shoeRentalCents: number
}

export interface PricingSettingsFormProps {
  values: PricingSettingsFormValues
  onChange: (next: PricingSettingsFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  readOnly?: boolean
  error?: string | null
  successMessage?: string | null
  periodsSlot?: React.ReactNode
  saveButton?: React.ReactNode
}

const STRATEGY_OPTIONS: Array<{ value: PricingStrategy; label: string }> = [
  { value: 'per_person_hour', label: 'Per person · per hour' },
  { value: 'per_lane_hour', label: 'Per lane · per hour' },
  { value: 'per_person_game', label: 'Per person · per game' },
  { value: 'packages_only', label: 'Fixed packages only' },
]

function strategyFormula(strategy: PricingStrategy): string {
  switch (strategy) {
    case 'per_lane_hour':
      return 'price = lanes × hours × rate'
    case 'per_person_game':
      return 'price = bowlers × games × rate'
    case 'packages_only':
      return 'price = package base price'
    default:
      return 'price = bowlers × hours × rate'
  }
}

function strategyUnit(strategy: PricingStrategy): string {
  switch (strategy) {
    case 'per_lane_hour':
      return 'per lane\nper hour'
    case 'per_person_game':
      return 'per person\nper game'
    case 'packages_only':
      return 'packages only'
    default:
      return 'per person\nper hour'
  }
}

function exampleTotalCents(rateCents: number, strategy: PricingStrategy): number {
  if (strategy === 'packages_only') return rateCents
  if (strategy === 'per_lane_hour') return Math.round(rateCents * 2 * 2)
  if (strategy === 'per_person_game') return Math.round(rateCents * 6 * 2)
  return Math.round(rateCents * 6 * 2)
}

export function PricingSettingsForm({
  values,
  onChange,
  onSubmit,
  submitting,
  readOnly,
  error,
  successMessage,
  periodsSlot,
  saveButton,
}: PricingSettingsFormProps) {
  function patch(update: Partial<PricingSettingsFormValues>) {
    onChange({ ...values, ...update })
  }

  const rateDollars = formatPriceInputValue(values.defaultRateCents)
  const exampleTotal = formatPrice(
    exampleTotalCents(values.defaultRateCents, values.strategy),
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!readOnly) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Pricing strategy
        </h2>
        <Select
          value={values.strategy}
          onChange={(e) =>
            patch({ strategy: e.target.value as PricingStrategy })
          }
          disabled={readOnly}
        >
          {STRATEGY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <div className="rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--color-action)_15%,transparent)] bg-[color-mix(in_srgb,var(--color-action)_6%,transparent)] px-3.5 py-2.5">
          <p className="font-mono text-xs font-semibold text-[var(--status-warning-text)]">
            {strategyFormula(values.strategy)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            6 bowlers · 2 hrs at {formatPrice(values.defaultRateCents)} →{' '}
            <span className="text-[var(--color-action)]">{exampleTotal}</span>
          </p>
        </div>
      </section>

      {values.strategy !== 'packages_only' ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
            Default rate
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-secondary)]">$</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              className="w-28 text-center [font-family:var(--font-display)] text-lg"
              value={rateDollars}
              onChange={(e) => {
                const cents = parsePriceInputValue(e.target.value)
                if (cents !== null) patch({ defaultRateCents: cents })
              }}
              disabled={readOnly}
            />
            <span className="whitespace-pre-line text-xs leading-snug text-[var(--color-text-secondary)]">
              {strategyUnit(values.strategy)}
            </span>
          </div>
        </section>
      ) : null}

      <div className="h-px bg-[var(--color-border)]" />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Shoe rental
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Rental price
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
              Per person · charged separately
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-secondary)]">$</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              className="w-[4.25rem] text-center [font-family:var(--font-display)]"
              inputSize="sm"
              value={formatPriceInputValue(values.shoeRentalCents)}
              onChange={(e) => {
                const cents = parsePriceInputValue(e.target.value)
                if (cents !== null) patch({ shoeRentalCents: cents })
              }}
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-[var(--color-border)]" />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Rate overrides
        </h2>
        <p className="px-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          Override periods replace the default rate for specific days or times.
        </p>
        {periodsSlot}
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      {!readOnly
        ? saveButton ?? (
            <Button type="submit" fullWidth loading={submitting}>
              Save pricing
            </Button>
          )
        : null}
    </form>
  )
}
