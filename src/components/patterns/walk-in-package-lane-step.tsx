'use client'

// WalkInPackageLaneStep — step 2: package + lane assignment.

import { Select } from '@/components/ui/select'
import { WalkInLaneMiniGrid } from '@/components/patterns/walk-in-lane-mini-grid'
import type { CockpitLaneCard } from '@/lib/actions/staff'
import {
  formatLaneSummary,
  formatPackageOptionLabel,
} from '@/lib/walk-in-display'
import type { Package } from '@/types'

export type WalkInPackageLaneStepValues = {
  packageId: string
  laneNumbers: number[]
  laneOverrideOpen: boolean
}

export type WalkInPackageLaneStepProps = {
  values: WalkInPackageLaneStepValues
  packages: Package[]
  lanes: CockpitLaneCard[]
  autoLaneNumbers: number[]
  onChange: (next: WalkInPackageLaneStepValues) => void
  onBack: () => void
  onNext: () => void
}

export function WalkInPackageLaneStep({
  values,
  packages,
  lanes,
  autoLaneNumbers,
  onChange,
  onBack,
  onNext,
}: WalkInPackageLaneStepProps) {
  function patch(update: Partial<WalkInPackageLaneStepValues>) {
    onChange({ ...values, ...update })
  }

  const activeLanes =
    values.laneOverrideOpen && values.laneNumbers.length > 0
      ? values.laneNumbers
      : autoLaneNumbers

  const canNext = activeLanes.length > 0

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Package{' '}
          <span className="normal-case font-normal">— optional</span>
        </span>
        <Select
          value={values.packageId}
          onChange={(e) => patch({ packageId: e.target.value })}
          className="border-[1.5px] border-solid border-[var(--color-border-strong)] bg-[var(--surface-raised)] px-3 py-2.5 text-[13px]"
        >
          <option value="">No package</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {formatPackageOptionLabel(pkg)}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
          Defaults to no package — lane only.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Lane
        </span>

        {!values.laneOverrideOpen ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border-[1.5px] border-solid border-[color-mix(in_srgb,var(--status-ok-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_6%,transparent)] px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-[var(--status-ok-text)]">
                Auto-assigned
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Next available lane
              </p>
            </div>
            <p className="text-base [font-family:var(--font-display)] text-[var(--color-text-primary)]">
              {formatLaneSummary(autoLaneNumbers)}
            </p>
            <button
              type="button"
              className="shrink-0 text-[11px] font-semibold text-[var(--color-action)]"
              onClick={() =>
                patch({
                  laneOverrideOpen: true,
                  laneNumbers: autoLaneNumbers,
                })
              }
            >
              Override
            </button>
          </div>
        ) : (
          <WalkInLaneMiniGrid
            lanes={lanes}
            selected={values.laneNumbers}
            requiredCount={Math.max(1, autoLaneNumbers.length)}
            onSelect={(laneNumbers) => patch({ laneNumbers })}
          />
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-raised)] px-3 py-3 text-[13px] text-[var(--color-text-secondary)]"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={!canNext}
          className="flex-[2] rounded-[var(--radius-md)] bg-[var(--color-action)] px-3 py-3 text-[13px] font-semibold text-[var(--color-text-on-action)] disabled:cursor-not-allowed disabled:opacity-35"
          onClick={() => {
            if (!values.laneOverrideOpen) {
              patch({ laneNumbers: autoLaneNumbers })
            }
            onNext()
          }}
        >
          Next — Confirm →
        </button>
      </div>
    </div>
  )
}
