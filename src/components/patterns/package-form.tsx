'use client'

// PackageForm — controlled form for create/edit of a Package.
// All state lives on the parent page; this pattern just renders the inputs
// and reports user intent via callbacks.

import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { formatPrice } from '@/lib/pricing'

export type PartyType = 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
export type PackageAccessType = 'PUBLIC' | 'CODE_REQUIRED'

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
  accessType: PackageAccessType
  codeString: string
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
      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Basics
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Name</span>
          <Input
            type="text"
            value={values.name}
            onChange={(name) => patch({ name })}
            isRequired
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Description
          </span>
          <Input
            type="text"
            value={values.description}
            onChange={(description) => patch({ description })}
            placeholder="Shown to customers in the package picker."
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Base price (cents) · {formatPrice(values.basePrice)}
            </span>
            <Input
              type="number"
              value={String(values.basePrice)}
              onChange={(value) =>
                patch({ basePrice: Math.max(0, Number(value) || 0) })
              }
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Sort order
            </span>
            <Input
              type="number"
              value={String(values.sortOrder)}
              onChange={(value) =>
                patch({ sortOrder: Number(value) || 0 })
              }
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Inclusions
        </h2>
        <Checkbox
          label="Games included in base price"
          isSelected={values.gameIncluded}
          onChange={(gameIncluded) => patch({ gameIncluded })}
        />
        {!values.gameIncluded ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Cost per extra game (cents) · {formatPrice(values.gameCostPer)}
            </span>
            <Input
              type="number"
              value={String(values.gameCostPer)}
              onChange={(value) =>
                patch({
                  gameCostPer: Math.max(0, Number(value) || 0),
                })
              }
              isRequired
            />
          </label>
        ) : null}
        <Checkbox
          label="Shoes included in base price"
          isSelected={values.shoesIncluded}
          onChange={(shoesIncluded) => patch({ shoesIncluded })}
        />
        {!values.shoesIncluded ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Shoe rental per bowler (cents) ·{' '}
              {formatPrice(values.shoeCostPer)}
            </span>
            <Input
              type="number"
              value={String(values.shoeCostPer)}
              onChange={(value) =>
                patch({
                  shoeCostPer: Math.max(0, Number(value) || 0),
                })
              }
              isRequired
            />
          </label>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Available for
        </h2>
        <div className="grid gap-2 md:grid-cols-2">
          {PARTY_TYPES.map((pt) => (
            <Checkbox
              key={pt.value}
              label={pt.label}
              isSelected={values.partyTypes.includes(pt.value)}
              onChange={() => togglePartyType(pt.value)}
            />
          ))}
        </div>
      </section>

      <section
        className={`flex flex-col gap-3 rounded-xl border border-solid bg-primary p-4 ${
          values.accessType === 'CODE_REQUIRED'
            ? 'border-brand'
            : 'border-secondary'
        }`}
      >
        <h2 className="text-sm font-semibold text-secondary">Access</h2>
        <NativeSelect
          label="Who can book"
          value={values.accessType}
          onChange={(e) =>
            patch({
              accessType: e.target.value as PackageAccessType,
            })
          }
          options={[
            { label: 'Public — shown in package picker', value: 'PUBLIC' },
            {
              label: 'Code required — unlock at checkout',
              value: 'CODE_REQUIRED',
            },
          ]}
        />
        {values.accessType === 'CODE_REQUIRED' ? (
          <Input
            type="text"
            label="Promo code (unique per venue)"
            value={values.codeString}
            onChange={(value) =>
              patch({ codeString: value.toUpperCase() })
            }
            placeholder="SUMMER25"
            isRequired
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Visibility
        </h2>
        <Checkbox
          label="Active (visible to customers)"
          isSelected={values.active}
          onChange={(active) => patch({ active })}
        />
        <p className="text-xs text-tertiary">
          Existing bookings keep their package even after archive — packages are
          never deleted, only hidden.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-success-primary">{successMessage}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
