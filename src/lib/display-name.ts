/** Split a stored display name into first token vs remainder. */
export function splitDisplayName(name: string): {
  firstName: string
  lastName: string
} {
  const trimmed = name.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  }
}

/** Join first + last name fields into a single User.name value. */
export function joinDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
}
