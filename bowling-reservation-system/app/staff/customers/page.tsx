'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Customer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  tier: string | null
  tierDiscount: number | null
  createdAt: string
  bookings: Array<{ id: string; date: string; startTime: string; status: string }>
}

export default function StaffCustomersPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters to search')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/staff/customers?q=${encodeURIComponent(query.trim())}`
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Search failed')
      }
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const name = (c: Customer) =>
    [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Customers</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Search</h2>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <Input
            label="Search by name, email, or phone"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="e.g. john@example.com"
          />
          <Button onClick={search} isLoading={loading}>
            Search
          </Button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {customers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Phone
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tier
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Discount
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm">{name(c)}</td>
                    <td className="px-4 py-2 text-sm">{c.email}</td>
                    <td className="px-4 py-2 text-sm">{c.phone ?? '—'}</td>
                    <td className="px-4 py-2 text-sm">{c.tier ?? 'REGULAR'}</td>
                    <td className="px-4 py-2 text-sm">
                      {c.tierDiscount != null ? `${c.tierDiscount}%` : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      <Link
                        href={`/staff/customers/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View / Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && query.trim().length >= 2 && customers.length === 0 && !error && (
          <p className="text-sm text-slate-500 py-4">No customers found.</p>
        )}
      </div>
    </div>
  )
}
