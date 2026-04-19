'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/ui/sheet'
import { ManagementSection } from '@/components/shared/management/ManagementPanel'
import { ManagementPanelBody } from '@/components/shared/management/ManagementPanel'

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
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        side="right"
        className="w-full max-w-full overflow-y-auto border-l-0 p-0 sm:max-w-[600px] sm:border-l"
      >
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 sm:h-64">
          {pkg.imageUrl ? (
            <img src={pkg.imageUrl} alt={pkg.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No image</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
            <SheetHeader>
              <SheetTitle className="text-left text-xl font-bold text-white sm:text-2xl">{pkg.name}</SheetTitle>
              <SheetDescription className="sr-only">Package details and customization options</SheetDescription>
            </SheetHeader>
          </div>
        </div>

        <ManagementPanelBody className="space-y-6 px-4 py-4 sm:px-6 sm:py-6">
          <ManagementSection title="What's included">
            <p className="leading-relaxed text-gray-600">{pkg.description || 'No description available.'}</p>
          </ManagementSection>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-gray-900">Base package</p>
              <p className="text-lg font-bold text-blue-600 sm:text-xl">${basePrice.toFixed(2)}</p>
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              {pkg.baseGuestCount ? <span>Serves {pkg.baseGuestCount}</span> : null}
              {pkg.durationMinutes ? <span>{pkg.durationMinutes / 60} hrs</span> : null}
            </div>
          </div>

          {(pkg.pricePerExtraGuest || pkg.pricePerExtraLane) && (
            <ManagementSection title="Customize your package" className="space-y-4">
              {pkg.pricePerExtraGuest && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <span aria-hidden className="text-lg text-blue-600">👥</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Additional guests</p>
                        <p className="text-sm text-gray-600">${extraGuestPrice.toFixed(2)} per guest</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                      <button
                        type="button"
                        onClick={() => setExtraGuests(Math.max(0, extraGuests - 1))}
                        disabled={extraGuests === 0}
                        className="rounded-full p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Decrease guests"
                      >
                        <Minus className="h-4 w-4 text-gray-700" />
                      </button>
                      <span className="min-w-[2rem] text-center font-semibold text-gray-900">{extraGuests}</span>
                      <button
                        type="button"
                        onClick={() => setExtraGuests(extraGuests + 1)}
                        className="rounded-full p-1 hover:bg-gray-200"
                        aria-label="Increase guests"
                      >
                        <Plus className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pkg.pricePerExtraLane && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <span aria-hidden className="text-lg text-blue-600">🎳</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Additional lanes</p>
                        <p className="text-sm text-gray-600">${extraLanePrice.toFixed(2)} per lane</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                      <button
                        type="button"
                        onClick={() => setExtraLanes(Math.max(0, extraLanes - 1))}
                        disabled={extraLanes === 0}
                        className="rounded-full p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Decrease lanes"
                      >
                        <Minus className="h-4 w-4 text-gray-700" />
                      </button>
                      <span className="min-w-[2rem] text-center font-semibold text-gray-900">{extraLanes}</span>
                      <button
                        type="button"
                        onClick={() => setExtraLanes(extraLanes + 1)}
                        className="rounded-full p-1 hover:bg-gray-200"
                        aria-label="Increase lanes"
                      >
                        <Plus className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </ManagementSection>
          )}
        </ManagementPanelBody>

        <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-blue-600 sm:text-2xl">${total.toFixed(2)}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="min-h-[48px] w-full rounded-full px-6"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)',
              boxShadow: '0px 0px 20px 0px rgba(99, 102, 241, 0.3)',
            }}
          >
            Add to cart
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
