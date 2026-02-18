'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface LaneBlock {
  id: string
  date: string
  startTime: string
  endTime: string
  lanes: number[]
  reason: string
  createdAt: string
}

interface RecurringLaneBlock {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  lanes: number[]
  reason: string
  recurrence: string
  endDate: string | null
  createdAt: string
}

export default function LaneBlocksPage() {
  const [blocks, setBlocks] = useState<LaneBlock[]>([])
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringLaneBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recurringError, setRecurringError] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const [selectedLanes, setSelectedLanes] = useState<number[]>([])
  const [recurringLanes, setRecurringLanes] = useState<number[]>([])

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
    loadRecurringBlocks()
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

  const loadRecurringBlocks = async () => {
    try {
      const response = await fetch('/api/admin/recurring-lane-blocks')
      if (!response.ok) throw new Error('Failed to load recurring blocks')
      const data = await response.json()
      setRecurringBlocks(data.blocks)
    } catch (err: any) {
      setRecurringError(err.message)
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

  const toggleRecurringLane = (lane: number) => {
    if (recurringLanes.includes(lane)) {
      setRecurringLanes(recurringLanes.filter(l => l !== lane))
    } else {
      setRecurringLanes([...recurringLanes, lane])
    }
  }

  const [recurringForm, setRecurringForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    recurrence: 'WEEKLY' as 'WEEKLY' | 'BIWEEKLY',
    endDate: '',
  })

  const submitRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecurringError(null)
    if (recurringLanes.length === 0) {
      setRecurringError('Select at least one lane')
      return
    }
    try {
      const res = await fetch('/api/admin/recurring-lane-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recurringForm,
          lanes: recurringLanes,
          endDate: recurringForm.endDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setShowRecurringForm(false)
      setRecurringLanes([])
      setRecurringForm({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', reason: '', recurrence: 'WEEKLY', endDate: '' })
      loadRecurringBlocks()
    } catch (err: any) {
      setRecurringError(err.message)
    }
  }

  const generateRecurring = async (id: string) => {
    setGeneratingId(id)
    try {
      const res = await fetch(`/api/admin/recurring-lane-blocks/${id}/generate?weeks=8`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      if (data.generated > 0) {
        loadBlocks()
      }
    } catch (err: any) {
      setRecurringError(err?.message || 'Failed to generate')
    } finally {
      setGeneratingId(null)
    }
  }

  const deleteRecurring = async (id: string) => {
    if (!confirm('Delete this recurring block? One-time blocks already generated will remain.')) return
    try {
      const res = await fetch(`/api/admin/recurring-lane-blocks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadRecurringBlocks()
    } catch (err: any) {
      setRecurringError(err.message)
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

      <div className="bg-white shadow rounded-lg overflow-hidden mb-10">
        <h2 className="text-xl font-semibold p-4 border-b">One-time lane blocks</h2>
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

      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Recurring lane blocks</h2>
        <p className="text-gray-600 text-sm mb-4">
          Create a template (e.g. every Monday 9–5). Use &quot;Generate&quot; to create one-time blocks for the next 8 weeks.
        </p>
      </div>

      {recurringError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {recurringError}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">Recurring templates</span>
        <Button onClick={() => setShowRecurringForm(!showRecurringForm)}>
          {showRecurringForm ? 'Cancel' : 'Create recurring block'}
        </Button>
      </div>

      {showRecurringForm && (
        <form onSubmit={submitRecurring} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">New recurring block</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day of week</label>
              <select
                value={recurringForm.dayOfWeek}
                onChange={(e) => setRecurringForm({ ...recurringForm, dayOfWeek: Number(e.target.value) })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Start time"
              type="time"
              value={recurringForm.startTime}
              onChange={(e) => setRecurringForm({ ...recurringForm, startTime: e.target.value })}
            />
            <Input
              label="End time"
              type="time"
              value={recurringForm.endTime}
              onChange={(e) => setRecurringForm({ ...recurringForm, endTime: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select
                value={recurringForm.recurrence}
                onChange={(e) => setRecurringForm({ ...recurringForm, recurrence: e.target.value as 'WEEKLY' | 'BIWEEKLY' })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
              </select>
            </div>
            <Input
              label="End date (optional)"
              type="date"
              value={recurringForm.endDate}
              onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
            />
            <Input
              label="Reason"
              value={recurringForm.reason}
              onChange={(e) => setRecurringForm({ ...recurringForm, reason: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Lanes ({recurringLanes.length} selected)</label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(lane => (
                <label key={lane} className="flex items-center cursor-pointer text-black">
                  <input
                    type="checkbox"
                    checked={recurringLanes.includes(lane)}
                    onChange={() => toggleRecurringLane(lane)}
                    className="mr-2"
                  />
                  <span className="text-sm">Lane {lane}</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Create recurring block</Button>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {recurringBlocks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No recurring blocks</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recurringBlocks.map(rb => (
              <div key={rb.id} className="p-6 flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{DAY_NAMES[rb.dayOfWeek]} · {rb.startTime} – {rb.endTime}</h3>
                  <p className="text-sm text-gray-600 mt-1">Lanes: {rb.lanes.join(', ')} · {rb.reason}</p>
                  <p className="text-sm text-gray-500">{rb.recurrence}{rb.endDate ? ` · until ${format(new Date(rb.endDate), 'yyyy-MM-dd')}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => generateRecurring(rb.id)}
                    disabled={generatingId === rb.id}
                  >
                    {generatingId === rb.id ? 'Generating…' : 'Generate (8 weeks)'}
                  </Button>
                  <Button variant="danger" onClick={() => deleteRecurring(rb.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

