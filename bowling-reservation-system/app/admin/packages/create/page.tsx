'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Upload, X } from 'lucide-react'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO', 'ARCADE']),
  isActive: z.boolean().default(true),
  imageUrl: z.string().max(500).optional().nullable(),
  durationMinutes: z.number().int().min(0).optional().nullable(),
  baseGuestCount: z.number().int().min(0).optional().nullable(),
  maxCapacity: z.number().int().min(0).optional().nullable(),
  pricePerExtraGuest: z.number().min(0).optional().nullable(),
  pricePerExtraLane: z.number().min(0).optional().nullable(),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().optional().nullable(),
})

type PackageFormData = z.infer<typeof packageSchema>

export default function CreatePackagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeInput, setIncludeInput] = useState('')
  const [includes, setIncludes] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      isActive: true,
      type: 'PARTY',
      featured: false,
      name: '',
      description: '',
      price: 20,
      imageUrl: '',
      baseGuestCount: 1,
      maxCapacity: 10,
    },
  })

  const descriptionValue = watch('description') || ''

  const composedDescription = useMemo(() => {
    const normalized = descriptionValue.trim()
    if (includes.length === 0) return normalized || null
    return `${normalized}${normalized ? '\n' : ''}Includes: ${includes.join(', ')}`
  }, [descriptionValue, includes])

  const addInclude = () => {
    const item = includeInput.trim()
    if (!item) return
    if (!includes.includes(item)) setIncludes((prev) => [...prev, item])
    setIncludeInput('')
  }

  const removeInclude = (item: string) => {
    setIncludes((prev) => prev.filter((entry) => entry !== item))
  }

  const onSubmit = async (data: PackageFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: parseFloat(String(data.price)),
          description: composedDescription,
          imageUrl: data.imageUrl || null,
          durationMinutes: data.durationMinutes ?? null,
          baseGuestCount: data.baseGuestCount ?? null,
          maxCapacity: data.maxCapacity ?? null,
          pricePerExtraGuest: data.pricePerExtraGuest ?? null,
          pricePerExtraLane: data.pricePerExtraLane ?? null,
          displayOrder: data.displayOrder ?? null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create package')
      }

      router.push('/staff/settings/packages')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/50 p-4 sm:p-8">
      <div className="mx-auto max-h-[92vh] w-full max-w-[512px] overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-slate-900">Add Package</h1>
            <button
              type="button"
              aria-label="Close"
              onClick={() => router.push('/staff/settings/packages')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Name</label>
              <input
                {...register('name')}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                placeholder="e.g., Family Fun"
              />
              {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                placeholder="e.g., Perfect for family outings with kids"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Package Image (Optional)</label>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                <Upload className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">Click to upload image</p>
                <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
              </div>
              <input
                {...register('imageUrl')}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                placeholder="Optional image URL"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Minimum Bowlers</label>
              <input
                type="number"
                min="1"
                {...register('baseGuestCount', {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v),
                })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Maximum Bowlers</label>
              <input
                type="number"
                min="1"
                {...register('maxCapacity', {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v),
                })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Price per Person</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-slate-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              {errors.price ? <p className="mt-1 text-xs text-rose-600">{errors.price.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Includes</label>
              <div className="flex gap-2">
                <input
                  value={includeInput}
                  onChange={(event) => setIncludeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addInclude()
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  placeholder="e.g., Shoe rental"
                />
                <button
                  type="button"
                  onClick={addInclude}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-4 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {includes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {includes.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-indigo-700"
                    >
                      {item}
                      <button type="button" onClick={() => removeInclude(item)} className="text-slate-400 hover:text-slate-700">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push('/staff/settings/packages')}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Adding...' : 'Add Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

