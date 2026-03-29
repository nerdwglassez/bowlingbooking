'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  imageUrl?: string | null
  durationMinutes?: number | null
  baseGuestCount?: number | null
  maxCapacity?: number | null
  pricePerExtraGuest?: number | null
  pricePerExtraLane?: number | null
}

interface PackageDetailPanelProps {
  package: Package | null
  onClose: () => void
  onAddToCart: (packageId: string, extraGuests?: number, extraLanes?: number) => void
  isOpen: boolean
}

export default function PackageDetailPanel({
  package: pkg,
  onClose,
  onAddToCart,
  isOpen,
}: PackageDetailPanelProps) {
  const [extraGuests, setExtraGuests] = useState(0)
  const [extraLanes, setExtraLanes] = useState(0)

  if (!isOpen || !pkg) return null

  const basePrice = Number(pkg.price)
  const extraGuestPrice = pkg.pricePerExtraGuest ? Number(pkg.pricePerExtraGuest) : 0
  const extraLanePrice = pkg.pricePerExtraLane ? Number(pkg.pricePerExtraLane) : 0
  const total = basePrice + (extraGuests * extraGuestPrice) + (extraLanes * extraLanePrice)

  const handleAddToCart = () => {
    onAddToCart(pkg.id, extraGuests > 0 ? extraGuests : undefined, extraLanes > 0 ? extraLanes : undefined)
    setExtraGuests(0)
    setExtraLanes(0)
    onClose()
  }

  return (
    <>
      {/* Backdrop — fades in with panel open */}
      <div
        className="modal-backdrop package-detail-backdrop-enter fixed inset-0 bg-black/40 sm:bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* sm+: right sheet slides in from the right; mobile: full-screen with subtle fade-up */}
      <div
        className="package-detail-panel-enter fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:max-w-[600px] bg-white z-50 shadow-2xl flex flex-col will-change-transform"
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Image section */}
        <div className="relative h-52 sm:h-64 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
          {pkg.imageUrl ? (
            <img
              src={pkg.imageUrl}
              alt={pkg.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-sm">No image</div>
          )}
          {/* Package name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
            <h2 id="package-detail-title" className="text-xl sm:text-2xl font-bold text-white">
              {pkg.name}
            </h2>
          </div>
        </div>

        {/* Content: scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* What's included */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What&apos;s included</h3>
            <p className="text-gray-600 leading-relaxed">
              {pkg.description || 'No description available.'}
            </p>
          </div>

          {/* Base package info */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-gray-900">Base package</span>
              <span className="text-lg sm:text-xl font-bold text-blue-600">${basePrice.toFixed(2)}</span>
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              {pkg.baseGuestCount && (
                <span>Serves {pkg.baseGuestCount}</span>
              )}
              {pkg.durationMinutes && (
                <span>{pkg.durationMinutes / 60} hrs</span>
              )}
            </div>
          </div>

          {/* Customize section */}
          {(pkg.pricePerExtraGuest || pkg.pricePerExtraLane) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customize your package</h3>
              
              {/* Additional guests */}
              {pkg.pricePerExtraGuest && (
                <div className="mb-4 p-4 border border-gray-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <span className="text-blue-600 text-lg">👥</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Additional guests</p>
                        <p className="text-sm text-gray-600">${extraGuestPrice.toFixed(2)} per guest</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                      <button
                        type="button"
                        onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))}
                        disabled={extraGuests === 0}
                        className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Decrease guests"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="min-w-[2rem] text-center font-semibold text-gray-900">
                        {extraGuests}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExtraGuests(extraGuests + 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                        aria-label="Increase guests"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional lanes */}
              {pkg.pricePerExtraLane && (
                <div className="mb-4 p-4 border border-gray-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <span className="text-blue-600 text-lg">🎳</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Additional lanes</p>
                        <p className="text-sm text-gray-600">${extraLanePrice.toFixed(2)} per lane</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                      <button
                        type="button"
                        onClick={() => setExtraLanes(Math.max(0, extraLanes - 1))}
                        disabled={extraLanes === 0}
                        className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Decrease lanes"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>
                      <span className="min-w-[2rem] text-center font-semibold text-gray-900">
                        {extraLanes}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExtraLanes(extraLanes + 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                        aria-label="Increase lanes"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Total + Add to cart */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="w-full rounded-full min-h-[48px] px-6"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)',
              boxShadow: '0px 0px 20px 0px rgba(99, 102, 241, 0.3)',
            }}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </>
  )
}
