'use client'

// PackageEditor — client island wrapping <PackageForm> with create/edit
// dispatch + archive button. Used by both /admin/packages/[id] and
// /admin/packages/new.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/base/buttons/button'
import {
  PackageForm,
  type PackageAccessType,
  type PackageFormValues,
  type PartyType,
} from '@/components/patterns/package-form'
import {
  archivePackageAction,
  createPackageAction,
  updatePackageAction,
  type AdminPackageRow,
  type PackageInput,
} from '@/lib/actions/admin'

interface PackageEditorProps {
  mode: 'create' | 'edit'
  tenantId: string
  initial?: AdminPackageRow
  /** List route after save/archive (defaults to admin packages). */
  listPath?: string
}

function defaultValues(initial?: AdminPackageRow): PackageFormValues {
  return {
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    basePrice: initial?.basePrice ?? 0,
    gameIncluded: initial?.gameIncluded ?? true,
    shoesIncluded: initial?.shoesIncluded ?? true,
    gameCostPer: initial?.gameCostPer ?? 0,
    shoeCostPer: initial?.shoeCostPer ?? 0,
    partyTypes: (initial?.partyTypes as PartyType[]) ?? ['OPEN'],
    active: initial?.active ?? true,
    sortOrder: initial?.sortOrder ?? 0,
    accessType: (initial?.accessType as PackageAccessType) ?? 'PUBLIC',
    codeString: initial?.codeString ?? '',
  }
}

function toInput(values: PackageFormValues): PackageInput {
  return {
    name: values.name,
    description: values.description || null,
    basePrice: values.basePrice,
    gameIncluded: values.gameIncluded,
    shoesIncluded: values.shoesIncluded,
    gameCostPer: values.gameIncluded ? null : values.gameCostPer,
    shoeCostPer: values.shoesIncluded ? null : values.shoeCostPer,
    partyTypes: values.partyTypes,
    active: values.active,
    sortOrder: values.sortOrder,
    accessType: values.accessType,
    codeString:
      values.accessType === 'CODE_REQUIRED' ? values.codeString : null,
  }
}

export function PackageEditor({
  mode,
  tenantId,
  initial,
  listPath = '/admin/packages',
}: PackageEditorProps) {
  const router = useRouter()
  const [values, setValues] = useState<PackageFormValues>(() =>
    defaultValues(initial),
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()
  const [archiving, startArchive] = useTransition()

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createPackageAction(tenantId, toInput(values))
          router.push(`${listPath}/${result.packageId}`)
          return
        }
        if (!initial) throw new Error('Missing package id for edit.')
        await updatePackageAction(initial.id, toInput(values))
        setSuccess('Package saved.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save package.')
      }
    })
  }

  function handleArchive() {
    if (!initial) return
    setError(null)
    setSuccess(null)
    startArchive(async () => {
      try {
        await archivePackageAction(initial.id)
        router.push(listPath)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not archive.')
      }
    })
  }

  return (
    <>
      <PackageForm
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        successMessage={success}
        submitLabel={mode === 'create' ? 'Create package' : 'Save package'}
      />
      {mode === 'edit' && initial?.active ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-primary">
              Archive this package
            </span>
            <span className="text-xs text-tertiary">
              Hides it from new customer bookings. Existing bookings keep
              their package reference.
            </span>
          </div>
          <Button
            color="primary-destructive"
            onClick={handleArchive}
            isLoading={archiving}
          >
            Archive
          </Button>
        </div>
      ) : null}
    </>
  )
}
