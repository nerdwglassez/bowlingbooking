'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatTime12Hour } from '@/lib/time'
import Toast from '@/components/ui/Toast'

type LaneBlock = {
  id: string
  date: string
  startTime: string
  endTime: string
  reason?: string | null
  lanes: number[]
}

type SettingsMeta = {
  canEdit: boolean
  settings: { totalLanes: number; reserveLanes: number }
}

export default function StaffBlackoutDatesPage() {
  const [meta, setMeta] = useState<SettingsMeta | null>(null)
  const [blocks, setBlocks] = useState<LaneBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('17:00')
  const [endTime, setEndTime] = useState('21:00')
  const [reason, setReason] = useState('Private event')
  const [laneCsv, setLaneCsv] = useState('1,2')

  const maxLane = meta?.settings.totalLanes ?? 24

  const load = async () => {
    setLoading(true)
    try {
      const [settingsRes, blocksRes] = await Promise.all([
        fetch('/api/staff/settings', { cache: 'no-store' }),
        fetch('/api/staff/settings/lane-blocks', { cache: 'no-store' }),
      ])
      if (!settingsRes.ok) throw new Error('Failed to load settings')
      if (!blocksRes.ok) throw new Error('Failed to load lane blocks')
      const settingsData = (await settingsRes.json()) as SettingsMeta
      const blocksData = (await blocksRes.json()) as { blocks: LaneBlock[] }
      setMeta(settingsData)
      setBlocks(blocksData.blocks)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load blackout dates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const parsedLanes = useMemo(
    () =>
      laneCsv
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= maxLane),
    [laneCsv, maxLane]
  )

  const createBlock = async () => {
    if (!date) {
      setMessage('Please choose a date.')
      return
    }
    if (parsedLanes.length === 0) {
      setMessage(`Provide at least one valid lane number (1-${maxLane}).`)
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/staff/settings/lane-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          reason,
          lanes: parsedLanes,
        }),
      })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to create lane block')
      }
      await load()
      setSuccessToast('Blackout block created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create lane block')
    } finally {
      setSaving(false)
    }
  }

  const removeBlock = async (id: string) => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/staff/settings/lane-blocks/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to delete lane block')
      }
      setBlocks((prev) => prev.filter((block) => block.id !== id))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete lane block')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Blackout Dates</h2>
        <p className="mt-1 text-sm text-slate-500">Block specific lanes from being booked on certain dates.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
        {loading || !meta ? (
          <p className="text-sm text-slate-500">Loading blackout configuration...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-sm text-slate-600">
                Date
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={!meta.canEdit} className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm text-slate-600">
                Start
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={!meta.canEdit} className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm text-slate-600">
                End
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={!meta.canEdit} className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5" />
              </label>
              <label className="text-sm text-slate-600">
                Lanes
                <input value={laneCsv} onChange={(event) => setLaneCsv(event.target.value)} disabled={!meta.canEdit} className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5" placeholder="1,2,3" />
              </label>
              <label className="text-sm text-slate-600">
                Reason
                <input value={reason} onChange={(event) => setReason(event.target.value)} disabled={!meta.canEdit} className="mt-1 w-full rounded-[14px] border border-slate-300 bg-white px-3 py-2.5" />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void createBlock()}
              disabled={!meta.canEdit || saving}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving...' : meta.canEdit ? 'Add Blackout' : 'Read-only access'}
            </button>

            {message ? <p className="text-sm text-rose-600">{message}</p> : null}
            <Toast
              message={successToast ?? ''}
              visible={!!successToast}
              onDismiss={() => setSuccessToast(null)}
              variant="success"
              autoDismissMs={3000}
            />

            <div className="space-y-2">
              {blocks.map((block) => (
                <div key={block.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-700">
                    {new Date(block.date).toLocaleDateString()} · {formatTime12Hour(block.startTime)}-{formatTime12Hour(block.endTime)} · Lanes {block.lanes.join(', ')} · {block.reason ?? 'No reason'}
                  </p>
                  {meta.canEdit ? (
                    <button
                      type="button"
                      onClick={() => void removeBlock(block.id)}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {blocks.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No blackout dates configured. Click "Add Blackout" to get started.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
