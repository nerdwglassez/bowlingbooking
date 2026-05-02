'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Upload, X } from 'lucide-react'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO', 'ARCADE']).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().max(500).optional().nullable(),
  durationMinutes: z.number().int().min(0).optional().nullable(),
  baseGuestCount: z.number().int().min(0).optional().nullable(),
  maxCapacity: z.number().int().min(0).optional().nullable(),
  pricePerExtraGuest: z.number().min(0).optional().nullable(),
  pricePerExtraLane: z.number().min(0).optional().nullable(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().optional().nullable(),
})

type PackageFormData = z.infer<typeof packageSchema>

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  isActive: boolean
  imageUrl?: string | null
  durationMinutes?: number | null
  baseGuestCount?: number | null
  maxCapacity?: number | null
  pricePerExtraGuest?: number | null
  pricePerExtraLane?: number | null
  featured?: boolean
  displayOrder?: number | null
}

export default function EditPackagePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pkg, setPkg] = useState<Package | null>(null)
  const [includeInput, setIncludeInput] = useState('')
  const [includes, setIncludes] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
  })

  const descriptionValue = watch('description') || ''

  useEffect(() => {
    const id = params?.id
    if (id) {
      loadPackage(typeof id === 'string' ? id : id[0])
    }
  }, [params?.id])

  const loadPackage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/packages/${id}`)
      if (!response.ok) throw new Error('Failed to load package')
      const data = await response.json()
      const parsed = parseDescription(data.package.description)
      setPkg(data.package)
      setIncludes(parsed.includes)
      reset({
        name: data.package.name,
        description: parsed.description,
        price: data.package.price,
        imageUrl: data.package.imageUrl || '',
        baseGuestCount: data.package.baseGuestCount ?? undefined,
        maxCapacity: data.package.maxCapacity ?? undefined,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
    setSaving(true)
    setError(null)

    try {
      const id = params?.id && (typeof params.id === 'string' ? params.id : params.id[0])
      if (!id) return
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: composedDescription,
          price: parseFloat(String(data.price)),
          type: pkg?.type ?? 'PARTY',
          isActive: pkg?.isActive ?? true,
          imageUrl: data.imageUrl || null,
          durationMinutes: pkg?.durationMinutes ?? null,
          baseGuestCount: data.baseGuestCount ?? pkg?.baseGuestCount ?? null,
          maxCapacity: data.maxCapacity ?? pkg?.maxCapacity ?? null,
          pricePerExtraGuest: pkg?.pricePerExtraGuest ?? null,
          pricePerExtraLane: pkg?.pricePerExtraLane ?? null,
          featured: pkg?.featured ?? false,
          displayOrder: pkg?.displayOrder ?? null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update package')
      }

      router.push('/staff/settings/packages')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-600 shadow-lg">Loading package...</div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/50 p-4 sm:p-8">
      <div className="mx-auto max-h-[92vh] w-full max-w-[512px] overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-slate-900">Edit Package</h1>
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
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,102,241,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function parseDescription(raw: string | null | undefined): { description: string; includes: string[] } {
  if (!raw) return { description: '', includes: [] }
  const match = raw.match(/\n?Includes:\s*(.+)$/i)
  const includes = match?.[1]
    ? match[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
  const description = raw.replace(/\n?Includes:\s*.+$/i, '').trim()
  return { description, includes }
}


