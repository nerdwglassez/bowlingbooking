'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ApiKeyRow {
  id: string
  name: string
  keyPrefix: string
  scopes: string
  rateLimitPerMinute: number
  createdAt: string
  lastUsedAt: string | null
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', scopes: 'availability,bookings:read,bookings:write', rateLimitPerMinute: 60 })

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/admin/api-keys')
      if (!res.ok) throw new Error('Failed to load API keys')
      const data = await res.json()
      setKeys(data.apiKeys || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setNewKey(null)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          scopes: form.scopes.trim(),
          rateLimitPerMinute: form.rateLimitPerMinute,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create key')
      setNewKey(data.key)
      setForm((f) => ({ ...f, name: '' }))
      loadKeys()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          ← Admin
        </Link>
      </div>

      <p className="text-gray-600 mb-6">
        Partner API keys for the public API. Use the key in the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header or{' '}
        <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>.{' '}
        <a href="/api/v1/openapi" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          OpenAPI spec
        </a>
      </p>

      {newKey && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="font-medium text-green-800 mb-1">New API key created</p>
          <p className="text-sm text-green-700 mb-2">Copy it now; it won&apos;t be shown again.</p>
          <code className="block p-3 bg-white rounded border border-green-300 text-sm break-all">{newKey}</code>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold p-4 border-b">Create key</h2>
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Partner website"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scopes (comma-separated)</label>
            <Input
              value={form.scopes}
              onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
              placeholder="availability,bookings:read,bookings:write"
            />
            <p className="text-xs text-gray-500 mt-1">availability | bookings:read | bookings:write | * (all)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate limit (requests/min)</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={form.rateLimitPerMinute}
              onChange={(e) => setForm((f) => ({ ...f, rateLimitPerMinute: parseInt(e.target.value, 10) || 60 }))}
              className="rounded border border-gray-300 px-3 py-2 w-24"
            />
          </div>
          <Button type="submit" disabled={creating || !form.name.trim()}>
            {creating ? 'Creating…' : 'Create API key'}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold p-4 border-b">Existing keys</h2>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No API keys yet. Create one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prefix</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate limit</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{k.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{k.keyPrefix}…</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{k.scopes}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{k.rateLimitPerMinute}/min</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(k.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {k.lastUsedAt ? format(new Date(k.lastUsedAt), 'MMM d, HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
