import { describe, expect, it } from 'vitest'

import { normalizePostgresSslMode } from './postgres-url'

describe('normalizePostgresSslMode', () => {
  it('upgrades sslmode=require to verify-full', () => {
    expect(
      normalizePostgresSslMode(
        'postgresql://user:pass@host/db?sslmode=require',
      ),
    ).toBe('postgresql://user:pass@host/db?sslmode=verify-full')
  })

  it('upgrades sslmode=prefer and verify-ca', () => {
    expect(
      normalizePostgresSslMode('postgres://host/db?sslmode=prefer'),
    ).toBe('postgres://host/db?sslmode=verify-full')
    expect(
      normalizePostgresSslMode('postgres://host/db?sslmode=verify-ca'),
    ).toBe('postgres://host/db?sslmode=verify-full')
  })

  it('is case-insensitive for legacy modes', () => {
    expect(
      normalizePostgresSslMode('postgres://host/db?sslmode=REQUIRE'),
    ).toBe('postgres://host/db?sslmode=verify-full')
  })

  it('leaves verify-full and other params unchanged', () => {
    const url = 'postgresql://user:pass@host/db?sslmode=verify-full&channel_binding=require'
    expect(normalizePostgresSslMode(url)).toBe(url)
    expect(normalizePostgresSslMode('postgresql://localhost/dev')).toBe(
      'postgresql://localhost/dev',
    )
  })
})
