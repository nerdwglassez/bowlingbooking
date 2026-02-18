'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatTime12Hour } from '@/lib/time'

interface CustomerDetail {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  tier: string | null
  tierDiscount: number | null
  newsletterOptIn: boolean | null
  createdAt: string
  bookings: Array<{
    id: string
    date: string
    startTime: string
    status: string
    totalPrice: number
  }>
}

export default function StaffCustomerDetailPage() {
  const params = useParams()
  const id = params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('REGULAR')
  const [tierDiscount, setTierDiscount] = useState<string>('')

  useEffect(() => {
    if (id) loadCustomer()
    else setLoading(false)
  }, [id])

  const loadCustomer = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/customers/${id}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Customer not found')
        throw new Error('Failed to load customer')
      }
      const data = await res.json()
      const c = data.customer as CustomerDetail
      setCustomer(c)
      setTier(c.tier ?? 'REGULAR')
      setTierDiscount(
        c.tierDiscount != null ? String(c.tierDiscount) : ''
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const saveTier = async () => {
    if (!id || !customer) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier as 'REGULAR' | 'VIP',
          tierDiscount:
            tierDiscount === '' ? null : Math.min(100, Math.max(0, Number(tierDiscount))),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Update failed')
      }
      const data = await res.json()
      setCustomer((prev) =>
        prev ? { ...prev, ...data.customer } : null
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const name = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.email
    : ''

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <p className="text-sm text-slate-500">Loading customer…</p>
      </div>
    )
  }

  if (error && !customer) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
        <Link href="/staff/customers" className="text-blue-600 hover:underline">
          Back to Customers
        </Link>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-4">
        <Link
          href="/staff/customers"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Customers
        </Link>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight mb-6">{name}</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Email</dt>
          <dd>{customer.email}</dd>
          <dt className="text-slate-500">Phone</dt>
          <dd>{customer.phone ?? '—'}</dd>
          <dt className="text-slate-500">Newsletter</dt>
          <dd>{customer.newsletterOptIn ? 'Yes' : 'No'}</dd>
          <dt className="text-slate-500">Member since</dt>
          <dd>{format(new Date(customer.createdAt), 'MMM d, yyyy')}</dd>
        </dl>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Member tier & benefits</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <Select
              label="Tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="border-slate-300 bg-white text-slate-700"
            >
              <option value="REGULAR">Regular</option>
              <option value="VIP">VIP</option>
            </Select>
          </div>
          <Input
            label="Discount % (0–100)"
            type="number"
            min={0}
            max={100}
            value={tierDiscount}
            onChange={(e) => setTierDiscount(e.target.value)}
            placeholder="e.g. 10"
          />
          <Button onClick={saveTier} isLoading={saving}>
            Save tier
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          VIP discount is applied at checkout when this customer is logged in.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent bookings</h2>
        {customer.bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customer.bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-sm">
                      {format(new Date(b.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2 text-sm">{formatTime12Hour(b.startTime)}</td>
                    <td className="px-4 py-2 text-sm">{b.status.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      ${Number(b.totalPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      <Link
                        href={`/staff/bookings/${b.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
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
