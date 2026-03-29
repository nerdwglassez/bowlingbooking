'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type PaymentMode = 'ONLINE' | 'INVOICE'

interface DiscountCodeRow {
  id: string
  code: string
  label: string | null
  paymentMode: PaymentMode
  discountPercent: string | null
  discountFixedAmount: string | null
  maxRedemptions: number | null
  redemptionCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminDiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    label: '',
    paymentMode: 'ONLINE' as PaymentMode,
    discountPercent: '',
    discountFixedAmount: '',
    maxRedemptions: '',
    expiresAt: '',
  })

  const load = async () => {
    try {
      const res = await fetch('/api/admin/discount-codes')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCodes(data.codes || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim(),
        label: form.label.trim() || null,
        paymentMode: form.paymentMode,
        isActive: true,
      }
      if (form.discountPercent.trim()) {
        body.discountPercent = parseFloat(form.discountPercent)
      }
      if (form.discountFixedAmount.trim()) {
        body.discountFixedAmount = parseFloat(form.discountFixedAmount)
      }
      if (form.maxRedemptions.trim()) {
        body.maxRedemptions = parseInt(form.maxRedemptions, 10)
      }
      if (form.expiresAt) {
        body.expiresAt = new Date(form.expiresAt).toISOString()
      }

      const res = await fetch('/api/admin/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setForm({
        code: '',
        label: '',
        paymentMode: 'ONLINE',
        discountPercent: '',
        discountFixedAmount: '',
        maxRedemptions: '',
        expiresAt: '',
      })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: DiscountCodeRow) => {
    try {
      const res = await fetch(`/api/admin/discount-codes/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      })
      if (!res.ok) throw new Error('Update failed')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Discount codes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Online codes apply a discount at Stripe checkout. Invoice codes confirm the booking without online payment
            (amount due on invoice).
          </p>
        </div>
        <Link href="/admin/packages" className="text-sm text-indigo-600 hover:underline">
          ← Packages
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <form onSubmit={createCode} className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Create code</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. ACME-2026"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label (internal)</label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Acme Corp events"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment mode *</label>
            <select
              value={form.paymentMode}
              onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentMode }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ONLINE">Online (card at checkout)</option>
              <option value="INVOICE">Invoice (no card; booking confirmed)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount % (optional)</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.discountPercent}
              onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
              placeholder="10"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fixed $ off (optional)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.discountFixedAmount}
              onChange={(e) => setForm((f) => ({ ...f, discountFixedAmount: e.target.value }))}
              placeholder="25"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max redemptions (optional)</label>
            <Input
              type="number"
              min={1}
              value={form.maxRedemptions}
              onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              placeholder="Unlimited"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires (optional)</label>
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>
        <Button type="submit" isLoading={saving}>
          Create code
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Mode</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Discount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Uses</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Expires</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.paymentMode === 'INVOICE' ? 'Invoice' : 'Online'}</td>
                <td className="px-4 py-3 text-gray-700">
                  {c.discountPercent != null && Number(c.discountPercent) > 0 && `${Number(c.discountPercent)}%`}
                  {c.discountPercent != null && Number(c.discountPercent) > 0 && c.discountFixedAmount != null && Number(c.discountFixedAmount) > 0 && ' + '}
                  {c.discountFixedAmount != null && Number(c.discountFixedAmount) > 0 && `$${Number(c.discountFixedAmount).toFixed(2)} off`}
                  {(!c.discountPercent || Number(c.discountPercent) <= 0) &&
                    (!c.discountFixedAmount || Number(c.discountFixedAmount) <= 0) &&
                    '—'}
                </td>
                <td className="px-4 py-3">
                  {c.redemptionCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-500">No codes yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}
