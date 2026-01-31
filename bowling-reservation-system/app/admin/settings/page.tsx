'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const settingsSchema = z.object({
  laneRentalPerHour: z.number().min(0, 'Must be positive'),
  shoeRental: z.number().min(0, 'Must be positive'),
  taxRate: z.number().min(0, 'Must be positive').max(1, 'Must be between 0 and 1'),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (!response.ok) throw new Error('Failed to load settings')
      const data = await response.json()
      reset({
        laneRentalPerHour: data.settings.laneRentalPerHour,
        shoeRental: data.settings.shoeRental,
        taxRate: data.settings.taxRate,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update settings')
      }

      setSuccess(result.message || 'Settings updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">System Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}


      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Pricing Configuration</h2>

        <div className="space-y-4">
          <Input
            label="Lane Rental per Hour ($)"
            type="number"
            step="0.01"
            min="0"
            error={errors.laneRentalPerHour?.message}
            {...register('laneRentalPerHour', { valueAsNumber: true })}
          />

          <Input
            label="Shoe Rental per Pair ($)"
            type="number"
            step="0.01"
            min="0"
            error={errors.shoeRental?.message}
            {...register('shoeRental', { valueAsNumber: true })}
          />

          <Input
            label="Tax Rate (0.08 = 8%)"
            type="number"
            step="0.001"
            min="0"
            max="1"
            error={errors.taxRate?.message}
            {...register('taxRate', { valueAsNumber: true })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" isLoading={saving}>
            Save Settings
          </Button>
        </div>
      </form>

    </div>
  )
}

