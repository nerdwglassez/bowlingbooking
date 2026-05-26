/** True when Prisma reports a unique-constraint violation (P2002). */
export function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

/** True when Prisma reports a serializable transaction conflict (P2034). */
export function isSerializableConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2034'
  )
}

/**
 * Narrow P2002 to specific unique index / field names from `meta.target`.
 * Prisma uses snake_case DB column names (e.g. `confirmation_code`).
 */
export function isUniqueConstraintOnField(
  err: unknown,
  fieldNames: string[],
): boolean {
  if (!isUniqueConstraintViolation(err)) return false
  const target = (err as { meta?: { target?: string | string[] } }).meta?.target
  const fields = Array.isArray(target)
    ? target
    : typeof target === 'string'
      ? [target]
      : []
  if (fields.length === 0) return false
  const normalized = fieldNames.map((f) => f.toLowerCase())
  return fields.some((f) =>
    normalized.some((name) => f.toLowerCase().includes(name)),
  )
}
