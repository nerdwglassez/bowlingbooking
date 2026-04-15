'use client'

import { useState, useEffect } from 'react'
import CustomerSearch from '@/components/staff/CustomerSearch'
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { format } from 'date-fns'
import { formatTime12Hour } from '@/lib/time'
import {
  calculateBookingPriceWithSettings,
  type PricingSettingsForBooking,
} from '@/lib/pricing'
import { X } from 'lucide-react'

export interface Customer {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  createdAt: string
  bookings: Array<{
    id: string
    date: string
    startTime: string
    status: string
  }>
}

interface Pkg {
  id: string
  name: string
  description: string | null
  price: number
  type: string
}

interface CreateBookingModalProps {
  onClose: () => void
  onCreated?: (bookingId: string) => void
}

function customerDisplayName(c: Customer): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email
}

export default function CreateBookingModal({ onClose, onCreated }: CreateBookingModalProps) {
  const [step, setStep] = useState(1)
  const [customerMode, setCustomerMode] = useState<'search' | 'create'>('search')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [createEmail, setCreateEmail] = useState('')
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createPhone, setCreatePhone] = useState('')

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [duration, setDuration] = useState<number>(60)
  const [lane, setLane] = useState<number>(0)
  const [numBowlers, setNumBowlers] = useState<number>(1)
  const [shoeSizes, setShoeSizes] = useState<number[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [pricingSettings, setPricingSettings] = useState<PricingSettingsForBooking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/packages').then(res => res.json()).then(data => setPackages(data.packages || [])),
      fetch('/api/pricing').then(res => res.json()).then(data => {
        if (data.laneRentalPerHour != null) {
          setPricingSettings({
            laneRentalPerHour: data.laneRentalPerHour,
            bowlerPricePerPerson: data.bowlerPricePerPerson ?? 0,
            shoeRental: data.shoeRental,
            taxRate: data.taxRate,
          })
        }
      }),
    ]).catch(err => console.error('Failed to load packages or pricing:', err))
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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

  const addPackage = (packageId: string) => {
    if (!packageId || selectedPackages.includes(packageId)) return
    setSelectedPackages(prev => [...prev, packageId])
  }

  const removePackage = (packageId: string) => {
    setSelectedPackages(selectedPackages.filter(id => id !== packageId))
  }

  const hasCustomerForBooking =
    selectedCustomer || (customerMode === 'create' && createEmail.trim())

  const pendingNewCustomerDisplayName = () =>
    [createFirstName.trim(), createLastName.trim()].filter(Boolean).join(' ').trim() || createEmail.trim()

  const handleSubmit = async () => {
    if (!hasCustomerForBooking) {
      setError('Please select a customer or enter email for a new customer')
      return
    }
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let userId: string

      if (selectedCustomer) {
        userId = selectedCustomer.id
      } else {
        const createRes = await fetch('/api/staff/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: createEmail.trim(),
            firstName: createFirstName.trim() || undefined,
            lastName: createLastName.trim() || undefined,
            phone: createPhone.trim() || undefined,
          }),
        })
        const createData = await createRes.json()
        if (!createRes.ok) {
          throw new Error(createData.error || 'Failed to create customer')
        }
        userId = createData.customer.id
      }

      const response = await fetch('/api/staff/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff:booking-updated'))
      }
      onCreated?.(result.booking.id)
      onClose()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const availablePackagesForDropdown = packages.filter(p => !selectedPackages.includes(p.id))

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">New Booking</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-1 pb-3">
          <div className="flex items-start">
            {[
              { step: 1, label: 'Customer' },
              { step: 2, label: 'Date & Time' },
              { step: 3, label: 'Details' },
              { step: 4, label: 'Review' },
            ].map(({ step: s, label }, i) => {
              const isActive = step === s
              const isComplete = step > s
              return (
                <div key={s} className="flex flex-1 flex-col items-center min-w-0">
                  <div className="flex w-full items-center">
                    <div
                      className={`shrink-0 rounded-full flex items-center justify-center font-semibold transition-all duration-200 ${
                        isActive
                          ? 'h-9 w-9 text-base bg-indigo-600 text-white ring-2 ring-indigo-200 ring-offset-2'
                          : isComplete
                            ? 'h-6 w-6 text-xs bg-indigo-600 text-white'
                            : 'h-6 w-6 text-xs bg-slate-100 text-slate-400'
                      }`}
                    >
                      {s}
                    </div>
                    {i < 3 && (
                      <div
                        className={`h-0.5 flex-1 min-w-1 rounded-full ${
                          isComplete ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-medium leading-tight text-center ${
                      isActive ? 'text-indigo-600' : isComplete ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Customer */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomerMode('search')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium ${
                    customerMode === 'search' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
                  }`}
                >
                  Search customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('create')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium ${
                    customerMode === 'create' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
                  }`}
                >
                  Create new customer
                </button>
              </div>

              {customerMode === 'search' && (
                <CustomerSearch
                  onSelect={setSelectedCustomer}
                  selectedCustomer={selectedCustomer}
                />
              )}

              {customerMode === 'create' && (
                <div className="space-y-3">
                  <Input
                    label="Email"
                    type="email"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                  <Input
                    label="First name"
                    value={createFirstName}
                    onChange={e => setCreateFirstName(e.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    label="Last name"
                    value={createLastName}
                    onChange={e => setCreateLastName(e.target.value)}
                    placeholder="Optional"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={createPhone}
                    onChange={e => setCreatePhone(e.target.value)}
                    placeholder="Optional"
                  />
                  <p className="text-sm text-slate-500">
                    The customer account will be created when you complete the booking.
                  </p>
                </div>
              )}

              {selectedCustomer && customerMode === 'search' && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Selected: {customerDisplayName(selectedCustomer)} ({selectedCustomer.email})
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!hasCustomerForBooking} className="min-h-[44px]">
                  Next: Date & Time
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <AvailabilityCalendar
                onTimeSelect={handleTimeSelect}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                compactDateWindow
              />
              {selectedDate && selectedTime && (
                <Select
                  label="Duration"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                >
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={150}>2.5 hours</option>
                  <option value={180}>3 hours</option>
                </Select>
              )}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                <Button variant="secondary" onClick={() => setStep(1)} className="min-h-[44px]">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedDate || !selectedTime} className="min-h-[44px]">
                  Next: Details
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Booking details – packages via dropdown */}
          {step === 3 && (
            <div className="space-y-4">
              <Input
                label="Number of Bowlers"
                type="number"
                min={1}
                max={10}
                value={numBowlers}
                onChange={e => setNumBowlers(Number(e.target.value))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Lane (optional)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={lane || ''}
                  onChange={e => setLane(e.target.value ? Number(e.target.value) : 0)}
                  placeholder="Auto-assign"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Shoe rentals (optional)
                </label>
                {shoeSizes.map((size, index) => (
                  <div key={index} className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      step={0.5}
                      placeholder="Shoe size"
                      value={size || ''}
                      onChange={e =>
                        handleShoeSizeChange(index, e.target.value ? Number(e.target.value) : '')
                      }
                    />
                    <Button variant="danger" onClick={() => handleShoeSizeChange(index, '')} className="min-h-[44px] sm:min-w-[96px]">
                      Remove
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addShoeSize} className="mt-1 min-h-[44px]">
                  Add shoe rental
                </Button>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Packages (optional)
                </label>
                <Select
                  key={`package-select-${selectedPackages.join(',')}`}
                  defaultValue=""
                  onChange={e => {
                    const id = e.target.value
                    if (id) addPackage(id)
                  }}
                >
                  <option value="">Add a package...</option>
                  {availablePackagesForDropdown.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — ${Number(pkg.price).toFixed(2)}
                    </option>
                  ))}
                </Select>
                {selectedPackages.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {selectedPackages.map(id => {
                      const pkg = packages.find(p => p.id === id)
                      return pkg ? (
                        <li
                          key={id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span>
                            {pkg.name} — ${Number(pkg.price).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePackage(id)}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ) : null
                    })}
                  </ul>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                <Button variant="secondary" onClick={() => setStep(2)} className="min-h-[44px]">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="min-h-[44px]">Next: Review</Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (() => {
            const numShoeRentals = shoeSizes.filter(s => s > 0).length
            const packagePrices = selectedPackages
              .map(id => packages.find(p => p.id === id)?.price)
              .filter((p): p is number => typeof p === 'number')
            const breakdown = pricingSettings
              ? calculateBookingPriceWithSettings(
                  pricingSettings,
                  duration,
                  numBowlers,
                  numShoeRentals,
                  packagePrices,
                  0,
                  1
                )
              : null

            return (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
                  <p className="text-sm text-slate-600">
                    {selectedCustomer
                      ? customerDisplayName(selectedCustomer) + (selectedCustomer.email ? ` (${selectedCustomer.email})` : '')
                      : customerMode === 'create' && createEmail.trim()
                        ? pendingNewCustomerDisplayName() +
                          ([createFirstName, createLastName].some(s => s.trim()) ? ` (${createEmail.trim()})` : '')
                        : '—'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Date & Time</h3>
                  <p className="text-sm text-slate-600">
                    {selectedDate && format(new Date(selectedDate), 'EEEE, MMM d')} at{' '}
                    {formatTime12Hour(selectedTime)}, {duration / 60} hr
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Details</h3>
                  <p className="text-sm text-slate-600">Bowlers: {numBowlers}</p>
                  {numShoeRentals > 0 && (
                    <p className="text-sm text-slate-600">
                      Shoes: {shoeSizes.filter(s => s > 0).join(', ')}
                    </p>
                  )}
                  {selectedPackages.length > 0 && (
                    <p className="text-sm text-slate-600">
                      Packages: {selectedPackages.map(id => packages.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                {breakdown && (
                  <div className="border-t border-slate-200 pt-3 space-y-1 text-sm">
                    <p className="flex justify-between text-slate-600">
                      <span>Lane</span>
                      <span>${breakdown.lanePrice.toFixed(2)}</span>
                    </p>
                    {breakdown.bowlerPrice > 0 && (
                      <p className="flex justify-between text-slate-600">
                        <span>Bowlers</span>
                        <span>${breakdown.bowlerPrice.toFixed(2)}</span>
                      </p>
                    )}
                    {breakdown.shoePrice > 0 && (
                      <p className="flex justify-between text-slate-600">
                        <span>Shoes</span>
                        <span>${breakdown.shoePrice.toFixed(2)}</span>
                      </p>
                    )}
                    {breakdown.packagePrice > 0 && (
                      <p className="flex justify-between text-slate-600">
                        <span>Packages</span>
                        <span>${breakdown.packagePrice.toFixed(2)}</span>
                      </p>
                    )}
                    <p className="flex justify-between font-medium text-slate-900">
                      <span>Subtotal</span>
                      <span>${breakdown.subtotal.toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span>${breakdown.tax.toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between font-semibold text-slate-900 pt-1">
                      <span>Total</span>
                      <span>${breakdown.total.toFixed(2)}</span>
                    </p>
                  </div>
                )}
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                  <Button variant="secondary" onClick={() => setStep(3)} className="min-h-[44px]">
                    Back
                  </Button>
                  <Button onClick={handleSubmit} isLoading={loading} className="min-h-[44px]">
                    Create Booking
                  </Button>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
