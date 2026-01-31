'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
}

interface PackageSelectionProps {
  selectedPackages: string[]
  onPackagesChange: (packageIds: string[]) => void
  onSkip: () => void
}

export default function PackageSelection({
  selectedPackages,
  onPackagesChange,
  onSkip,
}: PackageSelectionProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const url = filter ? `/api/packages?type=${filter}` : '/api/packages'
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch packages')
        const data = await response.json()
        setPackages(data.packages)
      } catch (error) {
        console.error('Error fetching packages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [filter])

  const togglePackage = (packageId: string) => {
    if (selectedPackages.includes(packageId)) {
      onPackagesChange(selectedPackages.filter(id => id !== packageId))
    } else {
      onPackagesChange([...selectedPackages, packageId])
    }
  }

  const packageTypes = ['FOOD', 'PARTY', 'DRINK']
  const filteredPackages = filter
    ? packages.filter(pkg => pkg.type === filter)
    : packages

  const selectedPackagesData = packages.filter(pkg =>
    selectedPackages.includes(pkg.id)
  )

  const totalPackagePrice = selectedPackagesData.reduce(
    (sum, pkg) => sum + Number(pkg.price),
    0
  )

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading packages...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Add Packages & Extras</h2>
        <p className="text-gray-600 mb-4">
          Enhance your booking with food, party packages, and more. You can skip this step if you don't need any packages.
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Packages
        </button>
        {packageTypes.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'FOOD' ? 'Food' : type === 'PARTY' ? 'Party' : 'Drink'}
          </button>
        ))}
      </div>

      {/* Package grid */}
      {filteredPackages.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p>No packages available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map(pkg => {
            const isSelected = selectedPackages.includes(pkg.id)
            return (
              <div
                key={pkg.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => togglePackage(pkg.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  {isSelected && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {pkg.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {pkg.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-blue-600">
                    ${Number(pkg.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">
                    {pkg.type}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selected packages summary */}
      {selectedPackages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold mb-2">Selected Packages ({selectedPackages.length})</h3>
          <div className="space-y-2 mb-3">
            {selectedPackagesData.map(pkg => (
              <div
                key={pkg.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{pkg.name}</span>
                <span className="font-medium">${Number(pkg.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between items-center font-semibold">
            <span>Package Total:</span>
            <span className="text-blue-600">${totalPackagePrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Skip button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onSkip}
        >
          {selectedPackages.length > 0 ? 'Continue Without Adding More' : 'Skip Packages'}
        </Button>
      </div>
    </div>
  )
}

