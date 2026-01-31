'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO']),
  isActive: z.boolean(),
})

type PackageFormData = z.infer<typeof packageSchema>

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  isActive: boolean
}

export default function EditPackagePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
  })

  useEffect(() => {
    if (params.id) {
      loadPackage(params.id as string)
    }
  }, [params.id])

  const loadPackage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/packages/${id}`)
      if (!response.ok) throw new Error('Failed to load package')
      const data = await response.json()
      reset({
        name: data.package.name,
        description: data.package.description || '',
        price: data.package.price,
        type: data.package.type,
        isActive: data.package.isActive,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: PackageFormData) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/packages/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: parseFloat(data.price as any),
          description: data.description || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update package')
      }

      router.push('/admin/packages')
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">Edit Package</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <div className="space-y-4">
          <Input
            label="Package Name"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what's included in this package..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                error={errors.price?.message}
                {...register('price', { valueAsNumber: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FOOD">Food</option>
                <option value="PARTY">Party</option>
                <option value="DRINK">Drink</option>
                <option value="COMBO">Combo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (visible to customers)
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}


