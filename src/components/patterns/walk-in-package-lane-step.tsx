'use client'

import { Button } from '@/components/base/buttons/button'
import { NativeSelect } from '@/components/base/select/select-native'
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
    <div className="flex flex-col gap-4">
      <NativeSelect
        label="Package"
        hint="Optional — defaults to lane only."
        value={values.packageId}
        onChange={(e) => patch({ packageId: e.target.value })}
        options={[
          { label: 'No package', value: '' },
          ...packages.map((pkg) => ({
            label: formatPackageOptionLabel(pkg),
            value: pkg.id,
          })),
        ]}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">Lane</span>

        {!values.laneOverrideOpen ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-success-primary px-3 py-3 ring-1 ring-success ring-inset">
            <div>
              <p className="text-sm font-semibold text-success-primary">
                Auto-assigned
              </p>
              <p className="text-xs text-tertiary">Next available lane</p>
            </div>
            <p className="text-md font-semibold text-primary">
              {formatLaneSummary(autoLaneNumbers)}
            </p>
            <Button
              type="button"
              color="link-color"
              size="sm"
              onClick={() =>
                patch({
                  laneOverrideOpen: true,
                  laneNumbers: autoLaneNumbers,
                })
              }
            >
              Override
            </Button>
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
        <Button
          type="button"
          color="secondary"
          size="md"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          color="primary"
          size="md"
          className="flex-[2]"
          isDisabled={!canNext}
          onClick={() => {
            if (!values.laneOverrideOpen) {
              patch({ laneNumbers: autoLaneNumbers })
            }
            onNext()
          }}
        >
          Next — Confirm
        </Button>
      </div>
    </div>
  )
}
