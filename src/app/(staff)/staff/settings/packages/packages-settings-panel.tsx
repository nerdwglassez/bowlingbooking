'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdminPackageRow } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'

type AccessTab = 'PUBLIC' | 'CODE_REQUIRED'

export function PackagesSettingsPanel({
  packages,
  canEdit,
}: {
  packages: AdminPackageRow[]
  canEdit: boolean
}) {
  const [tab, setTab] = useState<AccessTab>('PUBLIC')

  const filtered = useMemo(
    () => packages.filter((p) => p.accessType === tab),
    [packages, tab],
  )

  const publicCount = packages.filter((p) => p.accessType === 'PUBLIC').length
  const codeCount = packages.filter(
    (p) => p.accessType === 'CODE_REQUIRED',
  ).length

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href="/staff/settings/packages/new">
              <Plus className="size-4" aria-hidden />
              New package
            </Link>
          </Button>
        </div>
      ) : null}

      <div
        className="flex gap-1 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] p-1"
        role="tablist"
      >
        <TabButton
          active={tab === 'PUBLIC'}
          onClick={() => setTab('PUBLIC')}
          label={`Public (${publicCount})`}
        />
        <TabButton
          active={tab === 'CODE_REQUIRED'}
          onClick={() => setTab('CODE_REQUIRED')}
          label={`Code-gated (${codeCount})`}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No {tab === 'PUBLIC' ? 'public' : 'code-gated'} packages yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((pkg) => (
            <li key={pkg.id}>
              <PackageCard pkg={pkg} canEdit={canEdit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--surface-elevated)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {label}
    </button>
  )
}

function PackageCard({
  pkg,
  canEdit,
}: {
  pkg: AdminPackageRow
  canEdit: boolean
}) {
  const codeGated = pkg.accessType === 'CODE_REQUIRED'
  const inner = (
    <div
      className={`flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid bg-[var(--surface-elevated)] p-4 transition-colors md:flex-row md:items-center md:justify-between ${
        codeGated
          ? 'border-[color-mix(in_srgb,var(--color-action)_35%,var(--color-border))]'
          : 'border-[var(--color-border)]'
      } ${canEdit ? 'hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)]' : ''}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 shrink-0 rounded-full ${
              pkg.active
                ? 'bg-[var(--status-ok-text)]'
                : 'bg-[var(--color-text-secondary)]'
            }`}
            aria-hidden
          />
          <h2 className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {pkg.name}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pkg.partyTypes.map((pt) => (
            <Badge key={pt} variant="default">
              {pt}
            </Badge>
          ))}
          {codeGated && pkg.codeString ? (
            <Badge variant="info">{pkg.codeString}</Badge>
          ) : null}
          {!pkg.active ? <Badge variant="default">Archived</Badge> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm [font-family:var(--font-display)] text-[var(--color-action)]">
          {formatPrice(pkg.basePrice)}
        </span>
        {canEdit ? (
          <span className="text-xs text-[var(--color-text-secondary)]">Edit</span>
        ) : null}
      </div>
    </div>
  )

  if (!canEdit) return inner

  return (
    <Link href={`/staff/settings/packages/${pkg.id}`} className="block">
      {inner}
    </Link>
  )
}
