import { describe, expect, it } from 'vitest'

import {
  suggestionFromGooglePlace,
  suggestionFromPhotonFeature,
} from '@/lib/address-autocomplete'
import { normalizeUsState } from '@/lib/us-state'

describe('normalizeUsState', () => {
  it('passes through 2-letter codes', () => {
    expect(normalizeUsState('sc')).toBe('SC')
    expect(normalizeUsState('NY')).toBe('NY')
  })

  it('maps full state names', () => {
    expect(normalizeUsState('South Carolina')).toBe('SC')
    expect(normalizeUsState('district of columbia')).toBe('DC')
  })
})

describe('suggestionFromPhotonFeature', () => {
  it('builds street/city/state/zip from Photon properties', () => {
    const suggestion = suggestionFromPhotonFeature(
      {
        properties: {
          osm_id: 1,
          osm_type: 'W',
          housenumber: '8512',
          street: 'Two Notch Road',
          city: 'Columbia',
          state: 'South Carolina',
          postcode: '29223',
          countrycode: 'US',
        },
      },
      0,
    )
    expect(suggestion).toEqual({
      id: 'W:1:8512 Two Notch Road:Columbia:SC:29223',
      street: '8512 Two Notch Road',
      city: 'Columbia',
      state: 'SC',
      zip: '29223',
      label: '8512 Two Notch Road',
      description: 'Columbia, SC 29223',
    })
  })

  it('skips non-US results', () => {
    expect(
      suggestionFromPhotonFeature(
        {
          properties: {
            street: 'Main St',
            city: 'Toronto',
            state: 'Ontario',
            countrycode: 'CA',
          },
        },
        0,
      ),
    ).toBeNull()
  })
})

describe('suggestionFromGooglePlace', () => {
  it('parses Google address components', () => {
    const suggestion = suggestionFromGooglePlace({
      id: 'places/abc',
      formattedAddress: '8512 Two Notch Rd, Columbia, SC 29223, USA',
      addressComponents: [
        { longText: '8512', shortText: '8512', types: ['street_number'] },
        {
          longText: 'Two Notch Road',
          shortText: 'Two Notch Rd',
          types: ['route'],
        },
        { longText: 'Columbia', shortText: 'Columbia', types: ['locality'] },
        {
          longText: 'South Carolina',
          shortText: 'SC',
          types: ['administrative_area_level_1'],
        },
        { longText: '29223', shortText: '29223', types: ['postal_code'] },
        { longText: 'United States', shortText: 'US', types: ['country'] },
      ],
    })
    expect(suggestion).toMatchObject({
      street: '8512 Two Notch Road',
      city: 'Columbia',
      state: 'SC',
      zip: '29223',
      label: '8512 Two Notch Road',
      description: 'Columbia, SC 29223',
    })
  })
})
