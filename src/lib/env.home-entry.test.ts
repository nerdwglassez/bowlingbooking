import { afterEach, describe, expect, it } from 'vitest'

import { getHomeRedirectPath } from '@/lib/env.home-entry'

describe('getHomeRedirectPath', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_HOME_ENTRY
  })

  it('defaults to booking', () => {
    expect(getHomeRedirectPath()).toBe('/book')
  })

  it('respects NEXT_PUBLIC_HOME_ENTRY', () => {
    process.env.NEXT_PUBLIC_HOME_ENTRY = 'staff'
    expect(getHomeRedirectPath()).toBe('/signin?from=/staff')
    process.env.NEXT_PUBLIC_HOME_ENTRY = 'admin'
    expect(getHomeRedirectPath()).toBe('/signin?from=/admin')
  })

  it('page override wins over env', () => {
    process.env.NEXT_PUBLIC_HOME_ENTRY = 'book'
    expect(getHomeRedirectPath('staff')).toBe('/signin?from=/staff')
  })

  it('ignores invalid env values', () => {
    process.env.NEXT_PUBLIC_HOME_ENTRY = 'lobby'
    expect(getHomeRedirectPath()).toBe('/book')
  })
})
