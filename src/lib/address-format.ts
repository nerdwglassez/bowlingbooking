/** Parse a single-line tenant address into form fields (best effort). */
export interface ParsedAddress {
  street: string
  city: string
  state: string
  zip: string
}

const TRAILING_ZIP_RE =
  /^(.+?),\s*([^,]+?),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/

export function parseTenantAddress(full: string): ParsedAddress {
  const trimmed = full.trim()
  const match = trimmed.match(TRAILING_ZIP_RE)
  if (match) {
    return {
      street: match[1].trim(),
      city: match[2].trim(),
      state: match[3].trim(),
      zip: match[4].trim(),
    }
  }
  return { street: trimmed, city: '', state: '', zip: '' }
}

export function formatTenantAddress(parts: ParsedAddress): string {
  const street = parts.street.trim()
  const city = parts.city.trim()
  const state = parts.state.trim().toUpperCase()
  const zip = parts.zip.trim()
  if (!city && !state && !zip) return street
  return `${street}, ${city}, ${state} ${zip}`.replace(/,\s*,/g, ',').trim()
}
