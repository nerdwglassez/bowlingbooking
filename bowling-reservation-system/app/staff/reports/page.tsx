'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, startOfYear, subDays } from 'date-fns'
import { CalendarDays, Clock3, Download, DollarSign, LayoutGrid, Search, TrendingUp, Users } from 'lucide-react'
import Button from '@/components/ui/Button'
import ImmersiveStaffPage from '@/components/layout/ImmersiveStaffPage'
import StaffPageHero from '@/components/staff/StaffPageHero'
import { formatTime12Hour } from '@/lib/time'

interface BookingRow {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  status: string
  totalPrice: number
  numBowlers: number
  user: { email: string; firstName: string | null; lastName: string | null; tier?: string | null }
  bookingPackages?: Array<{ package?: { name: string; price?: number } }>
}

interface RevenueByDayRow {
  date: string
  revenue: number
  count: number
}

type RangePreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export default function StaffReportsPage() {
  const todayDate = new Date()
  const today = format(todayDate, 'yyyy-MM-dd')
  const [from, setFrom] = useState(format(subDays(todayDate, 6), 'yyyy-MM-dd'))
  const [to, setTo] = useState(today)
  const [rangePreset, setRangePreset] = useState<RangePreset>('week')
  const [tab, setTab] = useState<'analytics' | 'contacts'>('analytics')
  const [contactsSearch, setContactsSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    from: string
    to: string
    totalBookings: number
    revenue: number
    revenueByDay?: RevenueByDayRow[]
    bookings: BookingRow[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setDateRange = (preset: RangePreset) => {
    const now = new Date()
    if (preset === 'today') {
      setFrom(format(now, 'yyyy-MM-dd'))
      setTo(format(now, 'yyyy-MM-dd'))
    } else if (preset === 'week') {
      setFrom(format(subDays(now, 6), 'yyyy-MM-dd'))
      setTo(format(now, 'yyyy-MM-dd'))
    } else if (preset === 'month') {
      setFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
      setTo(format(now, 'yyyy-MM-dd'))
    } else if (preset === 'year') {
      setFrom(format(startOfYear(now), 'yyyy-MM-dd'))
      setTo(format(now, 'yyyy-MM-dd'))
    }
    setRangePreset(preset)
  }

  const loadReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to load report')
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [from, to])

  const exportCsv = () => {
    const exportFrom = data?.from ?? from
    const exportTo = data?.to ?? to
    window.open(
      `/api/staff/reports?from=${encodeURIComponent(exportFrom)}&to=${encodeURIComponent(exportTo)}&format=csv`,
      '_blank'
    )
  }

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const currencyWithCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

  const totalBowlers = useMemo(() => (data?.bookings ?? []).reduce((sum, booking) => sum + booking.numBowlers, 0), [data])
  const avgPartySize = data?.bookings.length ? totalBowlers / data.bookings.length : 0
  const laneUtilization = data?.bookings.length
    ? Math.min(100, Math.round((data.bookings.reduce((sum, b) => sum + b.duration, 0) / (data.bookings.length * 120)) * 100))
    : 0

  const peakHourLabel = useMemo(() => {
    if (!data?.bookings.length) return 'N/A'
    const hourCount: Record<number, number> = {}
    for (const booking of data.bookings) {
      const hour = Number(booking.startTime.split(':')[0] ?? 0)
      hourCount[hour] = (hourCount[hour] ?? 0) + 1
    }
    const top = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    const hourNum = Number(top)
    if (!Number.isInteger(hourNum)) return 'N/A'
    const nextHour = (hourNum + 1) % 24
    return `${formatTime12Hour(`${String(hourNum).padStart(2, '0')}:00`)} - ${formatTime12Hour(`${String(nextHour).padStart(2, '0')}:00`)}`
  }, [data])

  const topPackages = useMemo(() => {
    if (!data) return []
    const packageMap = new Map<string, { name: string; bookings: number; revenue: number }>()
    for (const booking of data.bookings) {
      for (const bookingPackage of booking.bookingPackages ?? []) {
        const name = bookingPackage.package?.name ?? 'Unnamed package'
        const current = packageMap.get(name) ?? { name, bookings: 0, revenue: 0 }
        current.bookings += 1
        current.revenue += Number(bookingPackage.package?.price ?? 0)
        packageMap.set(name, current)
      }
    }
    return Array.from(packageMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 4)
  }, [data])

  const contactRows = useMemo(() => {
    if (!data) return []
    const contacts = new Map<string, { email: string; displayName: string; bookings: number; revenue: number; lastDate: string }>()
    for (const booking of data.bookings) {
      const displayName = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim() || booking.user.email
      const current = contacts.get(booking.user.email) ?? {
        email: booking.user.email,
        displayName,
        bookings: 0,
        revenue: 0,
        lastDate: booking.date,
      }
      current.bookings += 1
      current.revenue += Number(booking.totalPrice)
      if (new Date(booking.date) > new Date(current.lastDate)) {
        current.lastDate = booking.date
      }
      contacts.set(booking.user.email, current)
    }
    return Array.from(contacts.values()).sort((a, b) => b.bookings - a.bookings)
  }, [data])

  const filteredContactRows = useMemo(() => {
    if (!contactsSearch.trim()) return contactRows
    const q = contactsSearch.trim().toLowerCase()
    return contactRows.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    )
  }, [contactRows, contactsSearch])

  const revenueSectionTitle = useMemo(() => {
    if (rangePreset === 'today') return 'Daily Revenue (Today)'
    if (rangePreset === 'week') return 'Daily Revenue (This Week)'
    if (rangePreset === 'month') return 'Daily Revenue (This Month)'
    if (rangePreset === 'year') return 'Daily Revenue (This Year)'
    return 'Daily Revenue (Custom Range)'
  }, [rangePreset])

  const maxRevenueValue = useMemo(
    () => Math.max(...(data?.revenueByDay ?? []).map((row) => row.revenue), 1),
    [data]
  )
  const maxBookingsValue = useMemo(
    () => Math.max(...(data?.revenueByDay ?? []).map((row) => row.count), 1),
    [data]
  )
  const axisSteps = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div>
      <ImmersiveStaffPage />
      <StaffPageHero
        title="Reports & Analytics"
        description="Track performance and gain insights into your business"
        gradient="reports"
      />

      <section className="px-4 py-6 sm:px-0">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="inline-flex rounded-[16px] border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTab('analytics')}
              className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold ${
                tab === 'analytics' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setTab('contacts')}
              className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold ${
                tab === 'contacts' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' : 'text-slate-600'
              }`}
            >
              <Users className="h-4 w-4" />
              Contacts
            </button>
          </div>

          {tab === 'analytics' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: 'This Year' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDateRange(preset.id as RangePreset)}
                      className={`rounded-[14px] border px-4 py-2 text-sm font-semibold ${
                        rangePreset === preset.id ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      {preset.id === 'custom' ? (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {preset.label}
                        </span>
                      ) : (
                        preset.label
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 whitespace-nowrap"
                  disabled={loading || !data}
                  title={!data ? 'Select a timeframe and wait for the report to load before exporting.' : `Export report for ${data.from} to ${data.to} as CSV`}
                >
                  <Download className="h-4 w-4" />
                  <span className="whitespace-nowrap">Export Report</span>
                </Button>
              </div>

              {rangePreset === 'custom' ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-500">to</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <Button onClick={loadReport} isLoading={loading}>Apply</Button>
            </div>
              ) : null}
            </>
          )}

          {tab === 'contacts' && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={contactsSearch}
                onChange={(e) => setContactsSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full max-w-md rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {!data ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              {loading ? 'Loading report...' : 'No data available for this range.'}
            </div>
          ) : tab === 'analytics' ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{currency.format(data.revenue)}</p>
                  <p className="mt-2 text-sm text-slate-500">Total Revenue</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{data.totalBookings}</p>
                  <p className="mt-2 text-sm text-slate-500">Total Bookings</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{totalBowlers}</p>
                  <p className="mt-2 text-sm text-slate-500">Total Bowlers</p>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Quick Metrics</h2>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-100 text-indigo-600">
                        <Users className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm text-slate-500">Average Party Size</p>
                        <p className="text-lg font-semibold text-slate-900">{avgPartySize ? `${avgPartySize.toFixed(1)} bowlers` : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-100 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm text-slate-500">Lane Utilization</p>
                        <p className="text-lg font-semibold text-slate-900">{laneUtilization}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-100 text-violet-600">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm text-slate-500">Peak Hours</p>
                        <p className="text-lg font-semibold text-slate-900">{peakHourLabel}</p>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Top Packages</h2>
                  <div className="mt-5 space-y-4">
                    {topPackages.length === 0 ? (
                      <p className="text-sm text-slate-500">No package sales in this range.</p>
                    ) : (
                      topPackages.map((pkg, index) => (
                        <div key={pkg.name} className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-xs font-bold ${
                                index === 0
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : index === 1
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900">{pkg.name}</p>
                              <p className="text-sm text-slate-500">{pkg.bookings} bookings</p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-emerald-600">{currencyWithCents.format(pkg.revenue)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </div>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">{revenueSectionTitle}</h2>
                <div className="mt-6 flex h-64 gap-3">
                  <div className="relative w-12 shrink-0">
                    {axisSteps.map((step) => (
                      <span
                        key={`rev-label-${step}`}
                        className="absolute right-0 -translate-y-1/2 text-xs font-medium text-slate-400"
                        style={{ top: `${(1 - step) * 100}%` }}
                      >
                        {Math.round(maxRevenueValue * step)}
                      </span>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    {axisSteps.map((step) => (
                      <div
                        key={`rev-grid-${step}`}
                        className="absolute left-0 right-0 border-t border-slate-200/90"
                        style={{ top: `${(1 - step) * 100}%` }}
                      />
                    ))}
                    <div className="relative z-10 flex h-full items-end gap-2">
                      {(data.revenueByDay ?? []).map((row) => {
                        const barHeight = Math.max(8, Math.round((row.revenue / maxRevenueValue) * 224))
                        return (
                          <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <div className="w-full rounded-t-[8px] bg-indigo-500" style={{ height: `${barHeight}px` }} />
                            <span className="text-xs text-slate-500">{format(new Date(row.date), 'EEE')}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  {rangePreset === 'week'
                    ? 'Daily Bookings (This Week)'
                    : rangePreset === 'today'
                      ? 'Daily Bookings (Today)'
                      : rangePreset === 'month'
                        ? 'Daily Bookings (This Month)'
                        : rangePreset === 'year'
                          ? 'Daily Bookings (This Year)'
                          : 'Daily Bookings (Custom Range)'}
                </h2>
                <div className="mt-6 flex h-64 gap-3">
                  <div className="relative w-12 shrink-0">
                    {axisSteps.map((step) => (
                      <span
                        key={`book-label-${step}`}
                        className="absolute right-0 -translate-y-1/2 text-xs font-medium text-slate-400"
                        style={{ top: `${(1 - step) * 100}%` }}
                      >
                        {Math.round(maxBookingsValue * step)}
                      </span>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    {axisSteps.map((step) => (
                      <div
                        key={`book-grid-${step}`}
                        className="absolute left-0 right-0 border-t border-slate-200/90"
                        style={{ top: `${(1 - step) * 100}%` }}
                      />
                    ))}
                    <div className="relative z-10 flex h-full items-end gap-2">
                      {(data.revenueByDay ?? []).map((row) => {
                        const barHeight = Math.max(8, Math.round((row.count / maxBookingsValue) * 224))
                        return (
                          <div key={`${row.date}-count`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <div className="w-full rounded-t-[8px] bg-violet-500" style={{ height: `${barHeight}px` }} />
                            <span className="text-xs text-slate-500">{format(new Date(row.date), 'M/d')}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </article>
            </>
          ) : (
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-900">Contacts</h2>
              <p className="mt-1 text-sm text-slate-500">Customers ordered by booking frequency in the selected range.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Contact</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Bookings</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Total Spent</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Last Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredContactRows.map((contact) => {
                      const initials = contact.displayName
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '?'
                      return (
                      <tr key={contact.email}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                              {initials}
                            </span>
                            <span className="text-sm font-medium text-slate-900">{contact.displayName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{contact.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{contact.bookings}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{currencyWithCents.format(contact.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{format(new Date(contact.lastDate), 'MMM d, yyyy')}</td>
                      </tr>
                      )
                    })}
                    {filteredContactRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          {contactRows.length === 0 ? 'No contacts in this date range.' : 'No contacts match your search.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {filteredContactRows.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <span>
                    Showing {filteredContactRows.length} of {contactRows.length} contact{contactRows.length !== 1 ? 's' : ''}
                  </span>
                  <span className="font-medium text-slate-700">
                    {contactRows.reduce((s, c) => s + c.bookings, 0)} Total Bookings · {currencyWithCents.format(contactRows.reduce((s, c) => s + c.revenue, 0))} Total Revenue
                  </span>
                </div>
              )}
            </article>
          )}
        </div>
      </section>
    </div>
  )
}
