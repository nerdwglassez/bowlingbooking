import { describe, expect, it } from 'vitest'

import {
  applyObservabilityTags,
  isStaffObservabilityName,
  observabilitySurfaceFromPath,
} from '@/lib/observability-surface'

describe('observabilitySurfaceFromPath', () => {
  it('tags employee cockpit and admin routes as staff', () => {
    expect(observabilitySurfaceFromPath('/staff')).toBe('staff')
    expect(observabilitySurfaceFromPath('/staff/schedule')).toBe('staff')
    expect(observabilitySurfaceFromPath('/admin/audit')).toBe('staff')
    expect(observabilitySurfaceFromPath('https://example.test/staff?view=lanes')).toBe(
      'staff',
    )
    expect(observabilitySurfaceFromPath('GET /staff')).toBe('staff')
    expect(observabilitySurfaceFromPath('staff.cockpit.load')).toBe('staff')
  })

  it('leaves customer booking untagged as staff', () => {
    expect(observabilitySurfaceFromPath('/book')).toBe('customer')
    expect(observabilitySurfaceFromPath('/book/confirm')).toBe('customer')
    expect(observabilitySurfaceFromPath('/dashboard')).toBe('customer')
    expect(observabilitySurfaceFromPath('/')).toBe('customer')
  })
})

describe('isStaffObservabilityName', () => {
  it('matches staff transaction names', () => {
    expect(isStaffObservabilityName('/staff')).toBe(true)
    expect(isStaffObservabilityName('/book/package')).toBe(false)
  })
})

describe('applyObservabilityTags', () => {
  it('adds app/surface tags for staff transactions', () => {
    const event = applyObservabilityTags({
      transaction: '/staff',
      tags: { existing: 'yes' },
    })
    expect(event.tags).toEqual({
      existing: 'yes',
      app: 'staff',
      surface: 'staff',
    })
  })

  it('does not tag customer events', () => {
    const event = applyObservabilityTags({
      request: { url: 'https://example.test/book' },
    })
    expect(event.tags).toBeUndefined()
  })
})
