'use client'

import { format } from 'date-fns'
import { CalendarDays, ChevronDown, Clock3, Package as PackageIcon, Trash2 } from 'lucide-react'
import type { BookingPriceBreakdown } from '@/lib/pricing'

export interface PackageItem {
  id: string
  name: string
  price: number
  baseGuestCount?: number | null
  imageUrl?: string | null
}

export interface ProductLineItem {
  productId: string
  name: string
  price: number
  quantity: number
}

export interface BookingSummaryProps {
  selectedDate: string
  selectedTime: string
  durationMinutes: number
  numBowlers: number
  numLanes: number
  /** Number of bowlers renting shoes */
  numShoeRentals: number
  /** Number of bowlers with own shoes */
  numOwnShoes: number
  packages: PackageItem[]
  productLineItems: ProductLineItem[]
  breakdown: BookingPriceBreakdown
  isPartyEvent?: boolean
  partyType?: string
  /** 'sidebar' = desktop sticky panel (single design per Figma 120-1914, builds over time); 'mobile-collapsible' = step 2 mobile; 'inline' = step 4 full block */
  variant: 'sidebar' | 'mobile-collapsible' | 'inline'
  /** Only for variant sidebar on step 2: allow removing packages (from mobile-collapsible expanded view) */
  onRemovePackage?: (packageId: string) => void
  /** Only for variant mobile-collapsible */
  expanded?: boolean
  onToggleExpand?: () => void
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}:00 ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export default function BookingSummary({
  selectedDate,
  selectedTime,
  durationMinutes,
  numBowlers,
  numLanes,
  numShoeRentals,
  numOwnShoes,
  packages,
  productLineItems,
  breakdown,
  isPartyEvent = false,
  partyType = '',
  variant,
  onRemovePackage,
  expanded = false,
  onToggleExpand,
}: BookingSummaryProps) {
  const dateLabel = selectedDate ? format(new Date(selectedDate), 'EEE, MMM d') : '—'
  const dateLabelSummary = selectedDate ? format(new Date(selectedDate), 'EEE, MMM d, yyyy') : '—' // Figma: "Tue, Feb 17, 2026"
  const timeLabel = formatTime(selectedTime)
  const dateLabelLong = selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : '—'
  const hours = durationMinutes / 60
  const canRemovePackages = (variant === 'sidebar' || variant === 'mobile-collapsible') && typeof onRemovePackage === 'function'

  const detailsBlock = (
    <>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-[#64748B]">
          <span>Date</span>
          <span className="text-[#0F172A] font-semibold">
            {selectedDate ? (variant === 'inline' ? dateLabelLong : dateLabel) : '—'}
          </span>
        </div>
        <div className="flex justify-between text-[#64748B]">
          <span>Time</span>
          <span className="text-[#0F172A] font-semibold">{timeLabel}</span>
        </div>
        <div className="flex justify-between text-[#64748B]">
          <span>Duration & lanes</span>
          <span className="text-[#0F172A] font-semibold">{hours} hr{hours !== 1 ? 's' : ''} · {numLanes} lane{numLanes !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between text-[#64748B]">
          <span>Bowlers</span>
          <span className="text-[#0F172A] font-semibold">{numBowlers} people</span>
        </div>
        {(isPartyEvent || partyType) && (
          <div className="flex justify-between text-[#64748B]">
            <span>Event type</span>
            <span className="text-[#0F172A] font-semibold">{isPartyEvent ? (partyType || 'Party event') : 'Casual'}</span>
          </div>
        )}
      </div>

      {packages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Added packages</p>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between rounded-xl border border-[#E2E8F0] p-3 bg-white"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0F172A] truncate">{pkg.name}</p>
                {pkg.baseGuestCount != null && (
                  <p className="text-xs text-[#64748B]">Serves {pkg.baseGuestCount}</p>
                )}
                <p className="text-sm font-semibold text-[#0F172A]">${Number(pkg.price).toFixed(2)}</p>
              </div>
              {canRemovePackages && (
                <button
                  type="button"
                  onClick={() => onRemovePackage?.(pkg.id)}
                  className="h-7 w-7 rounded-full border border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B] flex items-center justify-center flex-shrink-0 ml-2"
                  aria-label={`Remove ${pkg.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#E2E8F0] pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-[#64748B]">
          <span>Lane rental ({numLanes} x {hours}h)</span>
          <span className="text-[#0F172A] font-semibold">${breakdown.lanePrice.toFixed(2)}</span>
        </div>
        {breakdown.bowlerPrice > 0 && (
          <div className="flex justify-between text-[#64748B]">
            <span>Bowler fee</span>
            <span className="text-[#0F172A] font-semibold">${breakdown.bowlerPrice.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[#64748B]">
          <span>
            Shoe rental ({numShoeRentals} pair{numShoeRentals !== 1 ? 's' : ''})
            {numOwnShoes > 0 && ` · ${numOwnShoes} with own shoes`}
          </span>
          <span className="text-[#0F172A] font-semibold">${breakdown.shoePrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#64748B]">
          <span>Packages ({packages.length})</span>
          <span className="text-[#0F172A] font-semibold">${breakdown.packagePrice.toFixed(2)}</span>
        </div>
        {breakdown.productPrice > 0 && (
          <div className="flex justify-between text-[#64748B]">
            <span>Add-ons</span>
            <span className="text-[#0F172A] font-semibold">${breakdown.productPrice.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-[#E2E8F0] pt-2 flex justify-between">
          <span className="font-semibold text-[#0F172A]">Total</span>
          <span className="font-bold text-xl text-[#0F172A]">${breakdown.total.toFixed(2)}</span>
        </div>
        {variant !== 'inline' && (
          <p className="text-xs text-[#94A3B8] pt-2">Taxes and fees calculated at checkout</p>
        )}
      </div>
    </>
  )

  if (variant === 'mobile-collapsible') {
    return (
      <div className="lg:hidden sticky top-16 z-20 bg-white/95 backdrop-blur border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[10px] bg-[#EEF2FF] flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-[#6366F1]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                {selectedDate ? format(new Date(selectedDate), 'MMM d, yyyy') : 'Select date'}
              </p>
              <p className="text-xs text-[#64748B]">
                {timeLabel} · {numBowlers} bowler{numBowlers !== 1 ? 's' : ''}
                {numShoeRentals > 0 && ` · ${numShoeRentals} shoe rental${numShoeRentals !== 1 ? 's' : ''}`}
                {numOwnShoes > 0 && ` · ${numOwnShoes} own shoes`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#0F172A]">${breakdown.total.toFixed(2)}</span>
            <ChevronDown
              className={`h-5 w-5 text-[#64748B] transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
        {expanded && (
          <div className="border-t border-[#E2E8F0]">
            <div className="h-1 bg-[linear-gradient(90deg,rgba(99,102,241,1)_0%,rgba(59,130,246,1)_50%,rgba(236,72,153,1)_100%)]" />
            <div className="p-4 space-y-4">
              <h3 className="text-base font-semibold text-[#0F172A]">Booking summary</h3>
              {detailsBlock}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">Date & Time</h3>
          <p className="text-gray-600">
            {dateLabelLong} at {timeLabel}
          </p>
          <p className="text-gray-600">Duration: {hours} hour{hours !== 1 ? 's' : ''}</p>
          <p className="text-gray-600">{numLanes} lane{numLanes !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Details</h3>
          <p className="text-gray-600">Bowlers: {numBowlers}</p>
          {numShoeRentals > 0 && (
            <p className="text-gray-600">Shoe rentals: {numShoeRentals} pair{numShoeRentals !== 1 ? 's' : ''}</p>
          )}
          {numOwnShoes > 0 && (
            <p className="text-gray-600">{numOwnShoes} bowler{numOwnShoes !== 1 ? 's' : ''} with own shoes</p>
          )}
        </div>
        {packages.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900">Packages</h3>
            {packages.map((pkg) => (
              <p key={pkg.id} className="text-gray-600">
                {pkg.name} – ${Number(pkg.price).toFixed(2)}
              </p>
            ))}
          </div>
        )}
        {productLineItems.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900">Add-ons</h3>
            {productLineItems.map((item) => (
              <p key={item.productId} className="text-gray-600">
                {item.name} × {item.quantity} – ${(item.price * item.quantity).toFixed(2)}
              </p>
            ))}
          </div>
        )}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Lane rental</span>
            <span className="font-semibold text-gray-900">${breakdown.lanePrice.toFixed(2)}</span>
          </div>
          {breakdown.bowlerPrice > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Bowler fee</span>
              <span className="font-semibold text-gray-900">${breakdown.bowlerPrice.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Shoe rental ({numShoeRentals} pair{numShoeRentals !== 1 ? 's' : ''}{numOwnShoes > 0 ? `, ${numOwnShoes} own shoes` : ''})</span>
            <span className="font-semibold text-gray-900">${breakdown.shoePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Packages ({packages.length})</span>
            <span className="font-semibold text-gray-900">${breakdown.packagePrice.toFixed(2)}</span>
          </div>
          {breakdown.productPrice > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Add-ons</span>
              <span className="font-semibold text-gray-900">${breakdown.productPrice.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>${breakdown.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  // variant === 'sidebar' — sticky on lg+ so it follows the user on scroll; max-height so long content scrolls inside the card
  return (
    <div
      className="rounded-2xl overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain p-0.5 w-full"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.08) 100%)',
        boxShadow: '0px 10px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="h-1 bg-[linear-gradient(90deg,rgba(99,102,241,1)_0%,rgba(59,130,246,1)_50%,rgba(236,72,153,1)_100%)]" />
      <div className="bg-white rounded-b-2xl p-4 flex flex-col gap-4">
        <h3 className="text-base font-bold text-[#0F172A] leading-[1.6875]">Booking summary</h3>

        {/* Date and time — 24x24 icon, 13px semibold (Figma 120-1914) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.1)_0%,rgba(59,130,246,0.1)_100%)]">
              <CalendarDays className="h-3.5 w-3.5 text-[#6366F1]" />
            </div>
            <p className="text-[13px] font-semibold text-[#0F172A] leading-[1.5]">{dateLabelSummary}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.1)_0%,rgba(59,130,246,0.1)_100%)]">
              <Clock3 className="h-3.5 w-3.5 text-[#6366F1]" />
            </div>
            <p className="text-[13px] font-semibold text-[#0F172A] leading-[1.5]">{timeLabel}</p>
          </div>
        </div>

        {/* Cost breakdown — fixed order: Lane, Shoe, Packages, Bowlers, Add-ons (builds over time) */}
        <div className="border-t border-[#E2E8F0]/50 pt-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-normal text-[#64748B] leading-[1.43]">Lane rental ({numLanes})</span>
            <span className="text-[13px] font-semibold text-[#0F172A]">${breakdown.lanePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-normal text-[#64748B] leading-[1.43]">Shoe rental ({numShoeRentals} pair{numShoeRentals !== 1 ? 's' : ''})</span>
            <span className="text-[13px] font-semibold text-[#0F172A]">${breakdown.shoePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-normal text-[#64748B] leading-[1.43]">Packages ({packages.length})</span>
            <span className="text-[13px] font-semibold text-[#0F172A]">${breakdown.packagePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-normal text-[#64748B] leading-[1.43]">Bowlers ({numBowlers})</span>
            <span className="text-[13px] font-semibold text-[#0F172A]">${breakdown.bowlerPrice.toFixed(2)}</span>
          </div>
          {breakdown.productPrice > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-normal text-[#64748B] leading-[1.43]">Add-ons</span>
              <span className="text-[13px] font-semibold text-[#0F172A]">${breakdown.productPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Total — 15px semibold, amount 28px bold gradient, disclaimer 11px center */}
        <div className="border-t border-[#E2E8F0]/50 pt-3 pb-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[15px] font-semibold text-[#0F172A] leading-[1.5]">Total</span>
            <span className="text-[28px] font-bold leading-[1.5] bg-[linear-gradient(135deg,rgba(99,102,241,1)_0%,rgba(59,130,246,1)_100%)] bg-clip-text text-transparent">
              ${breakdown.total.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] font-normal text-[#94A3B8] leading-[1.5] text-center mt-2">
            Taxes and fees calculated at checkout
          </p>
        </div>
      </div>
    </div>
  )
}
