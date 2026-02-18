'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

type PackageItem = {
  id: string
  name: string
  description: string | null
  price: string | number
  type: string
  isActive: boolean
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'family', label: 'Family' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'special', label: 'Special' },
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

function packageMatchesCategory(pkg: PackageItem, category: CategoryId): boolean {
  if (category === 'all') return true
  const t = pkg.type.toUpperCase()
  if (category === 'family') return t === 'PARTY'
  if (category === 'birthday') return t === 'PARTY'
  if (category === 'corporate') return t === 'COMBO'
  if (category === 'special') return t === 'FOOD' || t === 'DRINK' || t === 'ARCADE'
  return true
}

export default function StaffPackagesSettingsPage() {
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const meResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (meResponse.ok) {
          const meData = (await meResponse.json()) as { user?: { role?: string } }
          const role = meData.user?.role
          if (mounted) setCanEdit(role === 'ADMIN')
        }

        const response = await fetch('/api/packages?activeOnly=false', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load packages')
        const data = (await response.json()) as { packages: PackageItem[] }
        if (mounted) setPackages(data.packages)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load packages')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredPackages = useMemo(
    () => packages.filter((pkg) => packageMatchesCategory(pkg, activeCategory)),
    [packages, activeCategory]
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Packages</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage special packages for your customers
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/admin/packages/create"
            className="inline-flex items-center gap-1.5 rounded-[14px] bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Package
          </Link>
        ) : (
          <span className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            View only
          </span>
        )}
      </div>

      {/* Category filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveCategory(id)}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-semibold transition ${
              activeCategory === id
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading packages...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-600">{error}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredPackages.map((pkg) => (
            <article
              key={pkg.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                    {pkg.description || 'No description provided.'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    pkg.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {pkg.type}
                </span>
                <span className="font-medium">${Number(pkg.price).toFixed(2)} per person</span>
              </div>
              {canEdit ? (
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/admin/packages/${pkg.id}`}
                    className="inline-flex items-center gap-1 rounded-[14px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-[14px] border border-slate-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Delete ${pkg.name}`}
                    title="Delete package"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {filteredPackages.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500">No packages in this category.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
