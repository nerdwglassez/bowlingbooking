// Path → Sentry surface tags. No SDK import — safe for client, server, and
// sentry.*.config.ts. Staff + admin share the employee experience.

export type ObservabilitySurface = 'staff' | 'customer'

const STAFF_PATH = /(?:^|\/)(?:staff|admin)(?:\/|$|\?)/

export function observabilitySurfaceFromPath(pathnameOrUrl: string): ObservabilitySurface {
  let path = pathnameOrUrl.trim()
  if (path.includes('://')) {
    try {
      path = new URL(path).pathname
    } catch {
      // keep the raw string — transaction names are not always URLs
    }
  }
  if (path.startsWith('staff.') || STAFF_PATH.test(path)) return 'staff'
  return 'customer'
}

export function isStaffObservabilityName(name: string): boolean {
  return observabilitySurfaceFromPath(name) === 'staff'
}

/** Matches Sentry Primitive without importing the SDK (drift chokepoint). */
type Primitive = number | string | boolean | bigint | symbol | null | undefined

type TaggableEvent = {
  tags?: Record<string, Primitive>
  transaction?: string
  request?: { url?: string }
}

/** Stamp staff tags on errors and transactions so Insights can filter them. */
export function applyObservabilityTags<T extends TaggableEvent>(event: T): T {
  const hint = `${event.request?.url ?? ''} ${event.transaction ?? ''}`
  if (observabilitySurfaceFromPath(hint) !== 'staff') return event
  event.tags = { ...event.tags, app: 'staff', surface: 'staff' }
  return event
}
