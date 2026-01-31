'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { format, addDays } from 'date-fns'

interface LaneBlock {
  id: string
  date: string
  startTime: string
  endTime: string
  lanes: number[]
  reason: string
  createdAt: string
}

export default function LaneBlocksPage() {
  const [blocks, setBlocks] = useState<LaneBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedLanes, setSelectedLanes] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      reason: '',
    },
  })

  useEffect(() => {
    loadBlocks()
  }, [])

  const loadBlocks = async () => {
    try {
      const response = await fetch('/api/admin/lane-blocks')
      if (!response.ok) throw new Error('Failed to load blocks')
      const data = await response.json()
      setBlocks(data.blocks)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    setError(null)

    if (selectedLanes.length === 0) {
      setError('Please select at least one lane')
      return
    }

    try {
      const response = await fetch('/api/admin/lane-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lanes: selectedLanes,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create block')
      }

      setShowForm(false)
      setSelectedLanes([])
      reset()
      loadBlocks()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteBlock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lane block?')) return

    try {
      const response = await fetch(`/api/admin/lane-blocks/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete block')

      loadBlocks()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleLane = (lane: number) => {
    if (selectedLanes.includes(lane)) {
      setSelectedLanes(selectedLanes.filter(l => l !== lane))
    } else {
      setSelectedLanes([...selectedLanes, lane])
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lane Blocks</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Block'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Lane Block</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Date"
              type="date"
              error={errors.date?.message as string}
              {...register('date', { required: 'Date is required' })}
            />
            <Input
              label="Start Time"
              type="time"
              error={errors.startTime?.message as string}
              {...register('startTime', { required: 'Start time is required' })}
            />
            <Input
              label="End Time"
              type="time"
              error={errors.endTime?.message as string}
              {...register('endTime', { required: 'End time is required' })}
            />
            <Input
              label="Reason"
              error={errors.reason?.message as string}
              {...register('reason', { required: 'Reason is required' })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Lanes (1-20) - {selectedLanes.length} selected
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(lane => (
                <label key={lane} className="flex items-center cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={selectedLanes.includes(lane)}
                    onChange={() => toggleLane(lane)}
                    className="mr-2"
                  />
                  <span className="text-sm" style={{ color: '#000000' }}>Lane {lane}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit">Create Block</Button>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {blocks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No lane blocks created yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {blocks.map(block => (
              <div key={block.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">
                      {format(new Date(block.date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {block.startTime} - {block.endTime}
                    </p>
                    <p className="text-sm text-gray-600">
                      Lanes: {block.lanes.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Reason: {block.reason}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => deleteBlock(block.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

