/**
 * Serialize Prisma results for `Response.json()` / `JSON.stringify`.
 * Converts Decimal and BigInt so route handlers don't throw and clients get plain numbers.
 */
export function prismaJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'object' && value !== null && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    try {
      return (value as { toNumber: () => number }).toNumber()
    } catch {
      return value
    }
  }
  return value
}

export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, prismaJsonReplacer)) as T
}

/** After JSON clone, `date` is an ISO string — keep `yyyy-MM-dd` for time composition in clients. */
export function normalizeBookingDateField<T extends { date?: unknown }>(row: T): T {
  const d = row.date
  if (typeof d !== 'string') return row
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : d.slice(0, 10)
  return { ...row, date: ymd }
}
