'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface Customer {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  createdAt: string
  bookings: Array<{
    id: string
    date: string
    startTime: string
    status: string
  }>
}

function customerDisplayName(c: Customer): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email
}

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void
  selectedCustomer?: Customer | null
}

export default function CustomerSearch({ onSelect, selectedCustomer }: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchCustomers = async () => {
    if (query.length < 2) {
      setError('Search query must be at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/staff/customers?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Failed to search customers')

      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (err: any) {
      setError(err.message)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCustomers()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          label="Search Customer"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <div className="flex items-end">
          <Button onClick={searchCustomers} isLoading={loading}>
            Search
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {customers.length > 0 && (
        <div className="border rounded-lg divide-y">
          {customers.map(customer => (
            <div
              key={customer.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onSelect(customer)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{customerDisplayName(customer)}</p>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                  <p className="text-sm text-gray-500">
                    Member since {new Date(customer.createdAt).toLocaleDateString()}
                  </p>
                  {customer.bookings.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {customer.bookings.length} previous booking{customer.bookings.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {selectedCustomer?.id === customer.id && (
                  <span className="text-blue-600 font-medium">Selected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">Selected Customer:</p>
          <p className="text-green-700 font-medium">{customerDisplayName(selectedCustomer)}</p>
          <p className="text-sm text-green-600">{selectedCustomer.email}</p>
        </div>
      )}
    </div>
  )
}


