import { describe, expect, it } from 'vitest'

import { joinDisplayName, splitDisplayName } from '@/lib/display-name'

describe('splitDisplayName', () => {
  it('splits on the first space', () => {
    expect(splitDisplayName('Olivia Rhye')).toEqual({
      firstName: 'Olivia',
      lastName: 'Rhye',
    })
  })

  it('keeps extra tokens in last name', () => {
    expect(splitDisplayName('Mary Ann Smith')).toEqual({
      firstName: 'Mary',
      lastName: 'Ann Smith',
    })
  })

  it('treats a single token as first name', () => {
    expect(splitDisplayName('Madonna')).toEqual({
      firstName: 'Madonna',
      lastName: '',
    })
  })
})

describe('joinDisplayName', () => {
  it('joins first and last', () => {
    expect(joinDisplayName('Olivia', 'Rhye')).toBe('Olivia Rhye')
  })

  it('omits empty last name', () => {
    expect(joinDisplayName('Madonna', '  ')).toBe('Madonna')
  })
})
