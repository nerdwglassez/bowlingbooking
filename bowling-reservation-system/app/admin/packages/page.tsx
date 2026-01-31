'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  isActive: boolean
  createdAt: string
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadPackages()
  }, [filter, typeFilter])

  const loadPackages = async () => {
    try {
      let url = '/api/admin/packages?activeOnly=false'
      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to load packages')
      const data = await response.json()
      let filtered = data.packages || []

      if (filter === 'active') {
        filtered = filtered.filter((p: Package) => p.isActive)
      } else if (filter === 'inactive') {
        filtered = filtered.filter((p: Package) => !p.isActive)
      }

      setPackages(filtered)
    } catch (err) {
      console.error('Failed to load packages:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (pkg: Package) => {
    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pkg,
          isActive: !pkg.isActive,
        }),
      })

      if (!response.ok) throw new Error('Failed to update package')
      loadPackages()
    } catch (err) {
      alert('Failed to update package')
    }
  }

  const deletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete package')
      }

      loadPackages()
    } catch (err: any) {
      alert(err.message || 'Failed to delete package')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FOOD':
        return 'bg-orange-100 text-orange-800'
      case 'PARTY':
        return 'bg-purple-100 text-purple-800'
      case 'DRINK':
        return 'bg-blue-100 text-blue-800'
      case 'COMBO':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Packages</h1>
        <Link href="/admin/packages/create">
          <Button>Create Package</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="FOOD">Food</option>
              <option value="PARTY">Party</option>
              <option value="DRINK">Drink</option>
              <option value="COMBO">Combo</option>
            </select>
          </div>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600 mb-4">No packages found</p>
          <Link href="/admin/packages/create">
            <Button>Create Your First Package</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {packages.map(pkg => (
              <div key={pkg.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{pkg.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(pkg.type)}`}>
                        {pkg.type}
                      </span>
                      {!pkg.isActive && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-gray-600 mb-2">{pkg.description}</p>
                    )}
                    <p className="text-xl font-bold text-blue-600">${Number(pkg.price).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/packages/${pkg.id}`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                    <Button
                      variant={pkg.isActive ? 'secondary' : 'primary'}
                      onClick={() => toggleActive(pkg)}
                    >
                      {pkg.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deletePackage(pkg.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

