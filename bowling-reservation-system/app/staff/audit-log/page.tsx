'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  details: string | null
  createdAt: string
}

export default function StaffAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')

  const loadEntries = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (entityTypeFilter) params.set('entityType', entityTypeFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/staff/audit-log?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setEntries(data.entries)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Audit Log</h1>
      <p className="text-sm text-slate-500 mb-6">
        Read-only view of staff and manager actions (e.g. price overrides).
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="w-full sm:w-auto sm:min-w-[190px]">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="min-h-[42px] border-slate-300 bg-white text-slate-700"
          >
            <option value="">All actions</option>
            <option value="PRICE_OVERRIDE">Price override</option>
          </Select>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[170px]">
          <Select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="min-h-[42px] border-slate-300 bg-white text-slate-700"
          >
            <option value="">All types</option>
            <option value="booking">Booking</option>
          </Select>
        </div>
        <Button variant="secondary" onClick={loadEntries} disabled={loading}>
          Apply filters
        </Button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-sm text-slate-500">
          No audit log entries found.
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Entity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-sm whitespace-nowrap">{format(new Date(e.createdAt), 'PPpp')}</td>
                    <td className="px-4 py-2 text-sm">{e.action.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-sm">{e.entityType} {e.entityId}</td>
                    <td className="px-4 py-2 text-sm font-mono text-slate-600">{e.userId.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-sm text-slate-600 max-w-xs truncate">
                      {e.details ? (
                        <span title={e.details}>
                          {tryFormatDetails(e.details)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function tryFormatDetails(json: string): string {
  try {
    const o = JSON.parse(json)
    const parts: string[] = []
    if (o.reasonCode) parts.push(o.reasonCode)
    if (o.previousTotal != null) parts.push(`was $${Number(o.previousTotal).toFixed(2)}`)
    if (o.newTotal != null) parts.push(`→ $${Number(o.newTotal).toFixed(2)}`)
    if (o.notes) parts.push(o.notes)
    return parts.join(' · ') || json.slice(0, 60)
  } catch {
    return json.slice(0, 60)
  }
}
