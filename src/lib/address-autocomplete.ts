import { normalizeUsState } from '@/lib/us-state'

export interface AddressSuggestion {
  id: string
  /** Street line shown in the input after selection (no city/state/zip). */
  street: string
  city: string
  state: string
  zip: string
  /** Primary list label (street). */
  label: string
  /** Secondary list label (city, ST ZIP). */
  description: string
}

export interface AddressAutocompleteResult {
  suggestions: AddressSuggestion[]
  /** `google` when GOOGLE_PLACES_API_KEY is set; otherwise `photon`. */
  provider: 'google' | 'photon'
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number | string
    osm_type?: string
    name?: string
    housenumber?: string
    street?: string
    city?: string
    town?: string
    village?: string
    locality?: string
    county?: string
    state?: string
    postcode?: string
    countrycode?: string
  }
}

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
    }
  }>
}

type GooglePlaceDetails = {
  id?: string
  formattedAddress?: string
  addressComponents?: Array<{
    longText?: string
    shortText?: string
    types?: string[]
  }>
}

function buildStreetLine(parts: {
  housenumber?: string
  street?: string
  name?: string
}): string {
  const number = parts.housenumber?.trim() ?? ''
  const street = parts.street?.trim() ?? ''
  if (number && street) return `${number} ${street}`
  if (street) return street
  return parts.name?.trim() ?? ''
}

function cityFromPhoton(props: NonNullable<PhotonFeature['properties']>): string {
  return (
    props.city?.trim() ||
    props.town?.trim() ||
    props.village?.trim() ||
    props.locality?.trim() ||
    ''
  )
}

export function suggestionFromPhotonFeature(
  feature: PhotonFeature,
  index: number,
): AddressSuggestion | null {
  const props = feature.properties
  if (!props) return null
  const country = (props.countrycode ?? '').toUpperCase()
  if (country && country !== 'US') return null

  const street = buildStreetLine(props)
  const city = cityFromPhoton(props)
  const state = normalizeUsState(props.state ?? '')
  const zip = (props.postcode ?? '').trim()
  if (!street) return null

  const id = [
    props.osm_type ?? 'n',
    props.osm_id ?? index,
    street,
    city,
    state,
    zip,
  ].join(':')

  const descriptionParts = [
    [city, state].filter(Boolean).join(', '),
    zip,
  ].filter(Boolean)
  const description = descriptionParts.join(' ')

  return {
    id,
    street,
    city,
    state,
    zip,
    label: street,
    description: description || (props.name?.trim() ?? ''),
  }
}

export function suggestionFromGooglePlace(details: GooglePlaceDetails): AddressSuggestion | null {
  const components = details.addressComponents ?? []
  const get = (...types: string[]) => {
    const match = components.find((c) =>
      types.some((t) => c.types?.includes(t)),
    )
    return match
  }

  const streetNumber = get('street_number')?.longText?.trim() ?? ''
  const route = get('route')?.longText?.trim() ?? ''
  const street =
    streetNumber && route
      ? `${streetNumber} ${route}`
      : route ||
        details.formattedAddress?.split(',')[0]?.trim() ||
        ''

  const city =
    get('locality')?.longText?.trim() ||
    get('sublocality', 'sublocality_level_1')?.longText?.trim() ||
    get('postal_town')?.longText?.trim() ||
    ''

  const state = normalizeUsState(
    get('administrative_area_level_1')?.shortText ??
      get('administrative_area_level_1')?.longText ??
      '',
  )
  const zip = get('postal_code')?.longText?.trim() ?? ''

  if (!street) return null

  const description = [[city, state].filter(Boolean).join(', '), zip]
    .filter(Boolean)
    .join(' ')

  return {
    id: details.id ?? `${street}|${city}|${state}|${zip}`,
    street,
    city,
    state,
    zip,
    label: street,
    description,
  }
}

function hasGooglePlacesApiKey(): boolean {
  return Boolean(process.env['GOOGLE_PLACES_API_KEY']?.trim())
}

async function autocompleteWithGoogle(query: string): Promise<AddressSuggestion[]> {
  const key = process.env['GOOGLE_PLACES_API_KEY']!.trim()

  const autoRes = await fetch(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text',
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ['us'],
        languageCode: 'en',
      }),
      next: { revalidate: 0 },
    },
  )

  if (!autoRes.ok) {
    throw new Error(`Google Places autocomplete failed (${autoRes.status})`)
  }

  const autoJson = (await autoRes.json()) as GoogleAutocompleteResponse
  const predictions =
    autoJson.suggestions
      ?.map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .slice(0, 5) ?? []

  const detailed = await Promise.all(
    predictions.map(async (prediction) => {
      const placeId = prediction.placeId!
      const detailRes = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'id,formattedAddress,addressComponents',
          },
          next: { revalidate: 0 },
        },
      )
      if (!detailRes.ok) {
        // Fall back to structured prediction text so the list still works.
        const street =
          prediction.structuredFormat?.mainText?.text?.trim() ||
          prediction.text?.text?.split(',')[0]?.trim() ||
          ''
        const description =
          prediction.structuredFormat?.secondaryText?.text?.trim() || ''
        if (!street) return null
        return {
          id: placeId,
          street,
          city: '',
          state: '',
          zip: '',
          label: street,
          description,
        } satisfies AddressSuggestion
      }
      const details = (await detailRes.json()) as GooglePlaceDetails
      return suggestionFromGooglePlace({ ...details, id: placeId })
    }),
  )

  return detailed.filter((s): s is AddressSuggestion => s != null)
}

async function autocompleteWithPhoton(query: string): Promise<AddressSuggestion[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '8')
  url.searchParams.set('lang', 'en')
  // Bias toward continental US without requiring a browser location.
  url.searchParams.set('lat', '39.8283')
  url.searchParams.set('lon', '-98.5795')

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      // Photon/Nominatim etiquette: identify the app.
      'User-Agent': 'RoyalZLanesBooking/1.0 (venue-settings-address-autocomplete)',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Address lookup failed (${res.status})`)
  }

  const json = (await res.json()) as { features?: PhotonFeature[] }
  const seen = new Set<string>()
  const out: AddressSuggestion[] = []

  for (const [index, feature] of (json.features ?? []).entries()) {
    const suggestion = suggestionFromPhotonFeature(feature, index)
    if (!suggestion) continue
    const key = `${suggestion.street}|${suggestion.city}|${suggestion.state}|${suggestion.zip}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(suggestion)
    if (out.length >= 5) break
  }

  return out
}

/**
 * Server-side address autocomplete for venue settings.
 * Prefers Google Places when `GOOGLE_PLACES_API_KEY` is set; otherwise Photon (OSM).
 */
export async function autocompleteAddress(
  query: string,
): Promise<AddressAutocompleteResult> {
  const q = query.trim()
  if (q.length < 3) {
    return {
      suggestions: [],
      provider: hasGooglePlacesApiKey() ? 'google' : 'photon',
    }
  }

  if (hasGooglePlacesApiKey()) {
    return {
      suggestions: await autocompleteWithGoogle(q),
      provider: 'google',
    }
  }

  return {
    suggestions: await autocompleteWithPhoton(q),
    provider: 'photon',
  }
}
