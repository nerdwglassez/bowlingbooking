'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, SearchLg } from '@untitledui/icons'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import type { AdminPackageRow } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'

type AccessTab = 'PUBLIC' | 'CODE_REQUIRED'
type PackageSort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

export function PackagesSettingsPanel({
  packages,
  canEdit,
}: {
  packages: AdminPackageRow[]
  canEdit: boolean
}) {
  const [tab, setTab] = useState<AccessTab>('PUBLIC')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PackageSort>('name-asc')

  const publicCount = packages.filter((p) => p.accessType === 'PUBLIC').length
  const codeCount = packages.filter(
    (p) => p.accessType === 'CODE_REQUIRED',
  ).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = packages.filter((p) => p.accessType === tab)
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.codeString?.toLowerCase().includes(q) ?? false),
      )
    }
    const next = [...rows]
    next.sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price-asc':
          return a.basePrice - b.basePrice
        case 'price-desc':
          return b.basePrice - a.basePrice
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name)
      }
    })
    return next
  }, [packages, tab, query, sort])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          aria-label="Search packages"
          placeholder="Search packages"
          icon={SearchLg}
          value={query}
          onChange={setQuery}
          size="sm"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            aria-label="Sort packages"
            size="sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as PackageSort)}
            options={[
              { label: 'Name A–Z', value: 'name-asc' },
              { label: 'Name Z–A', value: 'name-desc' },
              { label: 'Price low–high', value: 'price-asc' },
              { label: 'Price high–low', value: 'price-desc' },
            ]}
            className="w-44"
          />
          {canEdit ? (
            <Button
              href="/staff/settings/packages/new"
              size="sm"
              iconLeading={Plus}
            >
              New package
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="flex gap-1 rounded-xl border border-solid border-secondary bg-secondary p-1"
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
        <p className="text-sm text-tertiary">
          {query.trim()
            ? `No packages match "${query.trim()}"`
            : `No ${tab === 'PUBLIC' ? 'public' : 'code-gated'} packages yet.`}
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
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary shadow-xs'
          : 'text-tertiary hover:text-primary'
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
      className={`flex flex-col gap-2 rounded-xl border border-solid bg-primary p-4 transition-colors md:flex-row md:items-center md:justify-between ${
        codeGated ? 'ring-1 ring-brand' : 'border-secondary'
      } ${canEdit ? 'hover:border-secondary hover:bg-secondary' : ''}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 shrink-0 rounded-full ${
              pkg.active ? 'bg-success-solid' : 'bg-fg-quaternary'
            }`}
            aria-hidden
          />
          <h2 className="truncate text-sm font-medium text-primary">
            {pkg.name}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pkg.partyTypes.map((pt) => (
            <Badge key={pt} size="sm" color="gray" type="modern">
              {pt}
            </Badge>
          ))}
          {codeGated && pkg.codeString ? (
            <Badge size="sm" color="brand" type="pill-color">
              {pkg.codeString}
            </Badge>
          ) : null}
          {!pkg.active ? (
            <Badge size="sm" color="gray" type="pill-color">
              Archived
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-brand-secondary [font-family:var(--font-display)]">
          {formatPrice(pkg.basePrice)}
        </span>
        {canEdit ? <span className="text-xs text-tertiary">Edit</span> : null}
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
