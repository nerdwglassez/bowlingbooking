/** Split stored full name into first / last for the step 3 contact form. */
export function splitCustomerName(full: string): {
  firstName: string
  lastName: string
} {
  const trimmed = full.trim()
  const space = trimmed.indexOf(' ')
  if (space === -1) {
    return { firstName: trimmed, lastName: '' }
  }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  }
}

export function joinCustomerName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
}

export function isContactComplete(name: string, email: string): boolean {
  const { firstName, lastName } = splitCustomerName(name)
  if (firstName.length < 1 || lastName.length < 1) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
