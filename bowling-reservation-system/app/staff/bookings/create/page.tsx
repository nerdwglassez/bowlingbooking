'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CustomerSearch from '@/components/staff/CustomerSearch'
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { format } from 'date-fns'

interface Customer {
  id: string
  email: string
  createdAt: string
  bookings: Array<{
    id: string
    date: string
    startTime: string
    status: string
  }>
}

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
}

export default function CreateStaffBookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [duration, setDuration] = useState<number>(60)
  const [lane, setLane] = useState<number>(0)
  const [numBowlers, setNumBowlers] = useState<number>(1)
  const [shoeSizes, setShoeSizes] = useState<number[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => setPackages(data.packages || []))
      .catch(err => console.error('Failed to load packages:', err))
  }, [])

  const handleTimeSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
  }

  const handleShoeSizeChange = (index: number, size: number | '') => {
    const newSizes = [...shoeSizes]
    if (size === '') {
      newSizes.splice(index, 1)
    } else {
      newSizes[index] = size
    }
    setShoeSizes(newSizes)
  }

  const addShoeSize = () => {
    setShoeSizes([...shoeSizes, 0])
  }

  const togglePackage = (packageId: string) => {
    if (selectedPackages.includes(packageId)) {
      setSelectedPackages(selectedPackages.filter(id => id !== packageId))
    } else {
      setSelectedPackages([...selectedPackages, packageId])
    }
  }

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer')
      return
    }
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCustomer.id,
          date: selectedDate,
          startTime: selectedTime,
          duration,
          lane: lane || undefined,
          numBowlers,
          shoeSizes: shoeSizes.filter(size => size > 0),
          packageIds: selectedPackages,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      router.push(`/staff/bookings/${result.booking.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold mb-6">Create Booking for Walk-In</h1>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Customer</span>
          <span>Date & Time</span>
          <span>Details</span>
          <span>Review</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Select Customer</h2>
          <CustomerSearch
            onSelect={setSelectedCustomer}
            selectedCustomer={selectedCustomer}
          />
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedCustomer}
            >
              Next: Date & Time
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>
          <AvailabilityCalendar
            onTimeSelect={handleTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
          {selectedDate && selectedTime && (
            <div className="mt-6">
              <Select
                label="Duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={150}>2.5 hours</option>
                <option value={180}>3 hours</option>
              </Select>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedDate || !selectedTime}
            >
              Next: Booking Details
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Booking Details */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
          <div className="space-y-4">
            <Input
              label="Number of Bowlers"
              type="number"
              min="1"
              max="10"
              value={numBowlers}
              onChange={(e) => setNumBowlers(Number(e.target.value))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lane Number (optional - will be auto-assigned)
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={lane || ''}
                onChange={(e) => setLane(e.target.value ? Number(e.target.value) : 0)}
                placeholder="Auto-assign"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shoe Rentals (optional)
              </label>
              {shoeSizes.map((size, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    step="0.5"
                    placeholder="Shoe size"
                    value={size || ''}
                    onChange={(e) =>
                      handleShoeSizeChange(index, e.target.value ? Number(e.target.value) : '')
                    }
                  />
                  <Button
                    variant="danger"
                    onClick={() => handleShoeSizeChange(index, '')}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="secondary" onClick={addShoeSize} className="mt-2">
                Add Shoe Rental
              </Button>
            </div>
            {packages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Packages (optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {packages.map(pkg => (
                    <div
                      key={pkg.id}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                        selectedPackages.includes(pkg.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePackage(pkg.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{pkg.name}</p>
                          <p className="text-xs text-gray-600">${Number(pkg.price).toFixed(2)}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedPackages.includes(pkg.id)}
                          onChange={() => togglePackage(pkg.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>Next: Review</Button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Review Booking</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Customer</h3>
              <p className="text-gray-600">{selectedCustomer?.email}</p>
            </div>
            <div>
              <h3 className="font-medium">Date & Time</h3>
              <p className="text-gray-600">
                {selectedDate && format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} at{' '}
                {selectedTime}
              </p>
              <p className="text-gray-600">Duration: {duration / 60} hour(s)</p>
            </div>
            <div>
              <h3 className="font-medium">Details</h3>
              <p className="text-gray-600">Bowlers: {numBowlers}</p>
              {shoeSizes.filter(s => s > 0).length > 0 && (
                <p className="text-gray-600">
                  Shoe Rentals: {shoeSizes.filter(s => s > 0).join(', ')}
                </p>
              )}
            </div>
            {selectedPackages.length > 0 && (
              <div>
                <h3 className="font-medium">Packages</h3>
                {selectedPackages.map(pkgId => {
                  const pkg = packages.find(p => p.id === pkgId)
                  return pkg ? (
                    <p key={pkgId} className="text-gray-600">
                      {pkg.name} - ${Number(pkg.price).toFixed(2)}
                    </p>
                  ) : null
                })}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={handleSubmit} isLoading={loading}>
              Create Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

