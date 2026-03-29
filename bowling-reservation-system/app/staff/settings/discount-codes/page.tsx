'use client'

import { useCallback, useEffect, useState } from 'react'
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

export default function StaffDiscountCodesSettingsPage() {
  const [codes, setCodes] = useState<DiscountCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [form, setForm] = useState({
    code: '',
    label: '',
    paymentMode: 'ONLINE' as PaymentMode,
    discountPercent: '',
    discountFixedAmount: '',
    maxRedemptions: '',
    expiresAt: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/discount-codes', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCodes(data.codes || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const meResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (meResponse.ok) {
          const meData = (await meResponse.json()) as { user?: { role?: string } }
          const role = meData.user?.role
          if (mounted) setCanEdit(role === 'ADMIN')
        }
      } catch {
        /* ignore me errors */
      }
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [load])

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

      const res = await fetch('/api/staff/discount-codes', {
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
      const res = await fetch(`/api/staff/discount-codes/${c.id}`, {
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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading discount codes…</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Discount codes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Promo and corporate codes for online checkout or invoice-style bookings. Customers enter these on the book
            flow.
          </p>
        </div>
        {!canEdit ? (
          <span className="shrink-0 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            View only
          </span>
        ) : null}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {canEdit ? (
        <form onSubmit={createCode} className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
          <h3 className="text-lg font-medium text-slate-900">Create code</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Code *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. ACME-2026"
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Label (internal)</label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Acme Corp events"
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment mode *</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentMode }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ONLINE">Online (card at checkout)</option>
                <option value="INVOICE">Invoice (no card; booking confirmed)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount % (optional)</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Fixed $ off (optional)</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Max redemptions (optional)</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Expires (optional)</label>
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
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Mode</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Discount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Uses</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Expires</th>
              <th className="px-4 py-3 text-right font-medium text-slate-700">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{c.code}</td>
                <td className="px-4 py-3 text-slate-700">{c.paymentMode === 'INVOICE' ? 'Invoice' : 'Online'}</td>
                <td className="px-4 py-3 text-slate-700">
                  {c.discountPercent != null && Number(c.discountPercent) > 0 && `${Number(c.discountPercent)}%`}
                  {c.discountPercent != null && Number(c.discountPercent) > 0 && c.discountFixedAmount != null && Number(c.discountFixedAmount) > 0 && ' + '}
                  {c.discountFixedAmount != null && Number(c.discountFixedAmount) > 0 && `$${Number(c.discountFixedAmount).toFixed(2)} off`}
                  {(!c.discountPercent || Number(c.discountPercent) <= 0) &&
                    (!c.discountFixedAmount || Number(c.discountFixedAmount) <= 0) &&
                    '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.redemptionCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  ) : (
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No discount codes yet.</p>
        )}
      </div>
    </div>
  )
}
