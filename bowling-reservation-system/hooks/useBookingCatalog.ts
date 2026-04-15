'use client'

import { useEffect, useState } from 'react'
import type { PricingSettingsForBooking } from '@/lib/pricing'

type Package = {
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

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  type: string
}

export function useBookingCatalog<PackageType extends Package = Package, ProductType extends Product = Product>() {
  const [packages, setPackages] = useState<PackageType[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  const [pricingSettings, setPricingSettings] = useState<PricingSettingsForBooking | null>(null)

  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.json())
      .then((data) => setPackages((data.packages || []) as PackageType[]))
      .catch((err) => console.error('Failed to load packages:', err))

    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts((data.products || []) as ProductType[]))
      .catch((err) => console.error('Failed to load products:', err))

    fetch('/api/pricing')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.laneRentalPerHour === 'number') {
          setPricingSettings({
            laneRentalPerHour: data.laneRentalPerHour,
            bowlerPricePerPerson: data.bowlerPricePerPerson ?? 0,
            shoeRental: data.shoeRental ?? 0,
            taxRate: data.taxRate ?? 0.08,
          })
        }
      })
      .catch(() => setPricingSettings(null))
  }, [])

  return {
    packages,
    products,
    pricingSettings,
  }
}
