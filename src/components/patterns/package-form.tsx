'use client'

// PackageForm — controlled form for create/edit of a Package.
// All state lives on the parent page; this pattern just renders the inputs
// and reports user intent via callbacks.

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/pricing'

export type PartyType = 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'

export interface PackageFormValues {
  name: string
  description: string
  /** Cents. */
  basePrice: number
  gameIncluded: boolean
  shoesIncluded: boolean
  /** Cents per extra game. Only meaningful when gameIncluded is false. */
  gameCostPer: number
  /** Cents per shoe rental. Only meaningful when shoesIncluded is false. */
  shoeCostPer: number
  partyTypes: PartyType[]
  active: boolean
  sortOrder: number
}

export interface PackageFormProps {
  values: PackageFormValues
  onChange: (next: PackageFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
  successMessage?: string | null
  submitLabel?: string
}

const PARTY_TYPES: Array<{ value: PartyType; label: string }> = [
  { value: 'OPEN', label: 'Open / general' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'COSMIC', label: 'Cosmic' },
]

export function PackageForm({
  values,
  onChange,
  onSubmit,
  submitting,
  error,
  successMessage,
  submitLabel = 'Save package',
}: PackageFormProps) {
  function patch(update: Partial<PackageFormValues>) {
    onChange({ ...values, ...update })
  }

  function togglePartyType(pt: PartyType) {
    const next = values.partyTypes.includes(pt)
      ? values.partyTypes.filter((t) => t !== pt)
      : [...values.partyTypes, pt]
    patch({ partyTypes: next })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Basics
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Name</span>
          <Input
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Description
          </span>
          <Input
            type="text"
            value={values.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Shown to customers in the package picker."
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Base price (cents) · {formatPrice(values.basePrice)}
            </span>
            <Input
              type="number"
              min={0}
              step={100}
              value={values.basePrice}
              onChange={(e) =>
                patch({ basePrice: Math.max(0, Number(e.target.value) || 0) })
              }
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Sort order
            </span>
            <Input
              type="number"
              value={values.sortOrder}
              onChange={(e) =>
                patch({ sortOrder: Number(e.target.value) || 0 })
              }
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Inclusions
        </h2>
        <Checkbox
          label="Games included in base price"
          checked={values.gameIncluded}
          onChange={(e) => patch({ gameIncluded: e.target.checked })}
        />
        {!values.gameIncluded ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Cost per extra game (cents) · {formatPrice(values.gameCostPer)}
            </span>
            <Input
              type="number"
              min={0}
              step={50}
              value={values.gameCostPer}
              onChange={(e) =>
                patch({
                  gameCostPer: Math.max(0, Number(e.target.value) || 0),
                })
              }
              required
            />
          </label>
        ) : null}
        <Checkbox
          label="Shoes included in base price"
          checked={values.shoesIncluded}
          onChange={(e) => patch({ shoesIncluded: e.target.checked })}
        />
        {!values.shoesIncluded ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Shoe rental per bowler (cents) ·{' '}
              {formatPrice(values.shoeCostPer)}
            </span>
            <Input
              type="number"
              min={0}
              step={50}
              value={values.shoeCostPer}
              onChange={(e) =>
                patch({
                  shoeCostPer: Math.max(0, Number(e.target.value) || 0),
                })
              }
              required
            />
          </label>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Available for
        </h2>
        <div className="grid gap-2 md:grid-cols-2">
          {PARTY_TYPES.map((pt) => (
            <Checkbox
              key={pt.value}
              label={pt.label}
              checked={values.partyTypes.includes(pt.value)}
              onChange={() => togglePartyType(pt.value)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Visibility
        </h2>
        <Checkbox
          label="Active (visible to customers)"
          checked={values.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Existing bookings keep their package even after archive — packages are
          never deleted, only hidden.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
