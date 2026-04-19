'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { LoadingBlock, EmptyCardBlock } from '@/components/shared/state/StateBlocks'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  isActive: boolean
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FOOD':
        return 'bg-orange-100 text-orange-800'
      case 'DRINK':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingBlock />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products (Food & Drink Add-ons)</h1>
        <Link href="/admin/products/create">
          <Button>Create Product</Button>
        </Link>
      </div>

      <p className="text-gray-600 mb-6">
        Individual food and drink items customers can add to a booking. Shown in Step 3 of the booking flow.
      </p>

      {products.length === 0 ? (
        <EmptyCardBlock
          className="bg-white p-8 shadow-md"
          title="No products yet"
          description=""
          action={
            <Link href="/admin/products/create">
              <Button>Create first product</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && (
                      <div className="text-sm text-gray-500">{p.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(p.type)}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">${Number(p.price).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={p.isActive ? 'text-green-600' : 'text-gray-400'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-blue-600 hover:underline mr-4"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
