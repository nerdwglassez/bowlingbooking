/**
 * Shared password rules and helpers for validation and UI feedback.
 * Kept in sync with Zod schemas in validations.ts.
 */

export const PASSWORD_MAX_LENGTH = 128

export interface PasswordRequirement {
  id: string
  label: string
  met: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  const p = password ?? ''
  return [
    { id: 'length', label: 'At least 8 characters', met: p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(p) },
    { id: 'number', label: 'One number', met: /[0-9]/.test(p) },
  ]
}

export function isPasswordValid(password: string): boolean {
  const reqs = getPasswordRequirements(password)
  return reqs.every((r) => r.met) && password.length <= PASSWORD_MAX_LENGTH
}
