'use client'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { SettingsFieldRow } from '@/components/patterns/settings-field-row'
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
      className="flex flex-col"
    >
      <SettingsFieldRow
        label="Pricing strategy"
        hint={`${strategyFormula(values.strategy)}. Example: 6 bowlers · 2 hrs at ${formatPrice(values.defaultRateCents)} → ${exampleTotal}.`}
      >
        <NativeSelect
          value={values.strategy}
          onChange={(e) =>
            patch({ strategy: e.target.value as PricingStrategy })
          }
          disabled={readOnly}
          options={STRATEGY_OPTIONS.map((opt) => ({
            label: opt.label,
            value: opt.value,
          }))}
        />
      </SettingsFieldRow>

      {values.strategy !== 'packages_only' ? (
        <SettingsFieldRow
          label="Default rate"
          hint={strategyUnit(values.strategy).replace('\n', ' · ')}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-tertiary">$</span>
            <Input
              type="number"
              className="w-28 text-center [font-family:var(--font-display)] text-lg"
              value={rateDollars}
              onChange={(value) => {
                const cents = parsePriceInputValue(value)
                if (cents !== null) patch({ defaultRateCents: cents })
              }}
              isDisabled={readOnly}
            />
          </div>
        </SettingsFieldRow>
      ) : null}

      <SettingsFieldRow
        label="Shoe rental"
        hint="Per person · charged separately."
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-tertiary">$</span>
          <Input
            type="number"
            className="w-[4.25rem] text-center [font-family:var(--font-display)]"
            value={formatPriceInputValue(values.shoeRentalCents)}
            onChange={(value) => {
              const cents = parsePriceInputValue(value)
              if (cents !== null) patch({ shoeRentalCents: cents })
            }}
            isDisabled={readOnly}
          />
        </div>
      </SettingsFieldRow>

      <SettingsFieldRow
        label="Rate overrides"
        hint="Override periods replace the default rate for specific days or times."
      >
        {periodsSlot}
      </SettingsFieldRow>

      {error ? (
        <p className="pt-4 text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="pt-4 text-sm text-success-primary">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex justify-end pt-4">
          {saveButton ?? (
            <Button type="submit" isLoading={submitting}>
              Save pricing
            </Button>
          )}
        </div>
      ) : null}
    </form>
  )
}
