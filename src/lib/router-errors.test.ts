import { describe, expect, it } from 'vitest'

import { redirectUrlFromDigest } from '@/lib/router-errors'

describe('redirectUrlFromDigest', () => {
  it('parses NEXT_REDIRECT digest', () => {
    expect(
      redirectUrlFromDigest('NEXT_REDIRECT;replace;/signin?from=%2Fadmin;307;'),
    ).toBe('/signin?from=%2Fadmin')
  })

  it('returns null for unrelated digests', () => {
    expect(redirectUrlFromDigest('abc123')).toBeNull()
  })

  it('rejects protocol-relative redirect digests', () => {
    expect(
      redirectUrlFromDigest('NEXT_REDIRECT;replace;//evil.com;307;'),
    ).toBeNull()
  })
})
