import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomerBookingDetail } from '@/lib/actions/customer'

const mocks = vi.hoisted(() => ({
  getBookingByLookupMock: vi.fn(),
  getTenantMock: vi.fn(),
}))

vi.mock('@/lib/actions/customer', () => ({
  getBookingByLookup: mocks.getBookingByLookupMock,
}))

vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
}))

import { GET } from './route'

function baseBooking(over: Partial<CustomerBookingDetail> = {}): CustomerBookingDetail {
  return {
    id: 'b1',
    confirmationCode: 'ABC123',
    startTime: new Date('2025-06-01T18:00:00.000Z'),
    endTime: new Date('2025-06-01T19:00:00.000Z'),
    bowlerCount: 4,
    laneCount: 2,
    totalAmount: 4500,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    status: 'CONFIRMED',
    isRefunded: false,
    packageName: 'Classic Bowling',
    cancellable: true,
    refundIfCancelled: 4500,
    policyWindowHours: 24,
    policyRefundPercent: 100,
    isPast: false,
    shoeSizes: [],
    ...over,
  }
}

describe('GET /api/bookings/[code]/ics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getTenantMock.mockResolvedValue({
      id: 't1',
      name: 'Royal Z Lanes',
      address: '1 Main St',
      slug: 'royalz',
      phone: '555',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      config: {},
    })
  })

  it('returns 404 when email query string is missing', async () => {
    const req = new Request('http://localhost/api/bookings/ABC123/ics')
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 text/plain when lookup returns null', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(null)
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
    expect(await res.text()).toBe('Booking not found')
  })

  it('returns 200 with text/calendar when lookup succeeds', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
  })

  it('body wraps a VCALENDAR', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('END:VCALENDAR')
  })

  it('includes SUMMARY with venue name', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    expect(text).toContain('SUMMARY:Bowling at Royal Z')
  })

  it('formats DTSTART and DTEND in UTC', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    expect(text).toContain('DTSTART:20250601T180000Z')
    expect(text).toContain('DTEND:20250601T190000Z')
  })

  it('uses CRLF line endings', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    const lines = text.split('\r\n')
    expect(lines.length).toBeGreaterThan(3)
    expect(text).not.toContain('\n\n')
  })

  it('sets STATUS:CANCELLED when booking is cancelled', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(
      baseBooking({ status: 'CANCELLED' }),
    )
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    expect(text).toContain('STATUS:CANCELLED')
  })

  it('escapes commas and semicolons in LOCATION', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(baseBooking())
    mocks.getTenantMock.mockResolvedValue({
      id: 't1',
      name: 'Royal Z Lanes',
      address: '100 Pin Path, North Wing; Door B',
      slug: 'royalz',
      phone: '555',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      config: {},
    })
    const req = new Request(
      'http://localhost/api/bookings/ABC123/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'ABC123' }) })
    const text = await res.text()
    expect(text).toContain('LOCATION:100 Pin Path\\, North Wing\\; Door B')
  })

  it('uppercases confirmation code in Content-Disposition filename', async () => {
    mocks.getBookingByLookupMock.mockResolvedValue(
      baseBooking({ confirmationCode: 'ZZTOP1' }),
    )
    const req = new Request(
      'http://localhost/api/bookings/zztop1/ics?email=jane@example.com',
    )
    const res = await GET(req, { params: Promise.resolve({ code: 'zztop1' }) })
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="booking-ZZTOP1.ics"',
    )
  })
})
