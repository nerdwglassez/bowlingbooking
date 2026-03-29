'use client'

import type { KeyboardEvent } from 'react'
import { Users, Clock, Plus, Check } from 'lucide-react'

export interface PackageSelectionCardPackage {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl?: string | null
  durationMinutes?: number | null
  baseGuestCount?: number | null
}

type Props = {
  pkg: PackageSelectionCardPackage
  isSelected: boolean
  onToggleAdd: () => void
  /** Opens the package detail panel (card body / image click). */
  onOpenDetails: () => void
}

/**
 * Step 2 package tile — matches Figma `1.0 Package card_desktop_onload` (Royal-Z, node 141:311):
 * 180px image, metadata row (Serves · HRS) with icons, title, gradient price, pill Add package.
 */
export default function PackageSelectionCard({ pkg, isSelected, onToggleAdd, onOpenDetails }: Props) {
  const price = Number(pkg.price)
  const hours = pkg.durationMinutes ? pkg.durationMinutes / 60 : null
  const hasServes = pkg.baseGuestCount != null && pkg.baseGuestCount > 0
  const hasDuration = hours != null && hours > 0
  const showMetaRow = hasServes || hasDuration

  const openDetails = () => {
    onOpenDetails()
  }

  const onCardKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetails()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
      <div
        role="button"
        tabIndex={0}
        aria-label={`View details for ${pkg.name}`}
        onClick={openDetails}
        onKeyDown={onCardKeyDown}
        className="flex flex-1 cursor-pointer flex-col text-left outline-none transition-colors hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/40"
      >
        <div className="h-[180px] shrink-0 overflow-hidden rounded-t-lg bg-slate-100">
          {pkg.imageUrl ? (
            <img src={pkg.imageUrl} alt={pkg.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-100/90 via-white to-sky-100/80"
              aria-hidden
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pb-3 pt-3">
          {showMetaRow ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] uppercase leading-4 text-slate-900/70">
              {hasServes ? (
                <span className="inline-flex items-center gap-1.5 font-mono tracking-wide">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-900/80" strokeWidth={1.75} aria-hidden />
                  Serves {pkg.baseGuestCount}
                </span>
              ) : null}
              {hasServes && hasDuration ? (
                <span className="font-semibold text-slate-900/70" aria-hidden>
                  ·
                </span>
              ) : null}
              {hasDuration ? (
                <span className="inline-flex items-center gap-1.5 font-mono tracking-wide">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-900/80" strokeWidth={1.75} aria-hidden />
                  {hours === 1 ? '1 HR' : `${hours} HRS`}
                </span>
              ) : null}
            </div>
          ) : null}

          <h3 className="text-lg font-semibold leading-snug tracking-tight text-[#0f172a]">{pkg.name}</h3>

          <p className="bg-gradient-to-r from-[#6366f1] to-[#3b82f6] bg-clip-text text-xl font-semibold leading-tight tracking-tight text-transparent sm:text-2xl">
            ${price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleAdd()
          }}
          className={`flex h-9 w-full items-center justify-center gap-1 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${
            isSelected
              ? 'border-transparent bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-sm'
              : 'border-indigo-500 bg-white text-indigo-600 hover:bg-indigo-50/80'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Add package
            </>
          )}
        </button>
      </div>
    </div>
  )
}
