// /admin/audit — read-only audit log (ADMIN-only via listAuditLogs).

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { EmptyState } from '@/components/patterns/empty-state'
import { listAuditLogs, type AuditLogFilter } from '@/lib/actions/admin'
import { AUDIT_LOG_ACTIONS } from '@/lib/audit-actions'

const ENTITY_TYPES = [
  'Booking',
  'Tenant',
  'Package',
  'User',
  'BlockedSlot',
] as const

type PageProps = {
  searchParams: Promise<{
    action?: string
    entityType?: string
    from?: string
    to?: string
    page?: string
    pageSize?: string
  }>
}

const whenFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function parseIsoDateStartUtc(s: string | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  return new Date(`${s}T00:00:00.000Z`)
}

function parseIsoDateEndUtc(s: string | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  return new Date(`${s}T23:59:59.999Z`)
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw == null || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 1) return fallback
  return n
}

function parseOptionalPositiveInt(raw: string | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n)) return undefined
  return n
}

function shortEntityId(id: string): string {
  if (id.length <= 8) return id
  return id.slice(-8)
}

function formatDetailsPreview(details: unknown): string {
  if (details == null) return '—'
  let str: string
  try {
    str = JSON.stringify(details, null, 2)
  } catch {
    str = String(details)
  }
  if (str.length <= 200) return str
  return `${str.slice(0, 200)}…`
}

function filterSummaryLine(parts: {
  action?: string
  entityType?: string
  from?: string
  to?: string
}): string {
  const bits: string[] = []
  if (parts.action) bits.push(`action: ${parts.action}`)
  if (parts.entityType) bits.push(`entity: ${parts.entityType}`)
  if (parts.from) bits.push(`from ${parts.from}`)
  if (parts.to) bits.push(`to ${parts.to}`)
  return bits.length > 0 ? bits.join(' · ') : 'Showing all entries'
}

function buildAuditQueryString(state: {
  action?: string
  entityType?: string
  from?: string
  to?: string
  page: number
  pageSize: number
}): string {
  const p = new URLSearchParams()
  if (state.action) p.set('action', state.action)
  if (state.entityType) p.set('entityType', state.entityType)
  if (state.from) p.set('from', state.from)
  if (state.to) p.set('to', state.to)
  if (state.page > 1) p.set('page', String(state.page))
  if (state.pageSize !== 50) p.set('pageSize', String(state.pageSize))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const actionIn = sp.action?.trim() || undefined
  const entityTypeIn = sp.entityType?.trim() || undefined
  const fromIn = sp.from?.trim() || undefined
  const toIn = sp.to?.trim() || undefined

  const page = parsePositiveInt(sp.page, 1)
  const pageSizeRaw = parseOptionalPositiveInt(sp.pageSize)
  const filter: AuditLogFilter = {
    ...(actionIn ? { action: actionIn } : {}),
    ...(entityTypeIn ? { entityType: entityTypeIn } : {}),
    ...(() => {
      const startDate = parseIsoDateStartUtc(fromIn)
      const endDate = parseIsoDateEndUtc(toIn)
      const d: Pick<AuditLogFilter, 'startDate' | 'endDate'> = {}
      if (startDate) d.startDate = startDate
      if (endDate) d.endDate = endDate
      return d
    })(),
    page,
    ...(pageSizeRaw !== undefined ? { pageSize: pageSizeRaw } : {}),
  }

  const result = await listAuditLogs(filter)

  const queryBase = {
    action: actionIn,
    entityType: entityTypeIn,
    from: fromIn,
    to: toIn,
    page: result.page,
    pageSize: result.pageSize,
  }

  const prevHref =
    result.page > 1
      ? `/admin/audit${buildAuditQueryString({ ...queryBase, page: result.page - 1 })}`
      : undefined
  const nextHref = result.hasMore
    ? `/admin/audit${buildAuditQueryString({ ...queryBase, page: result.page + 1 })}`
    : undefined

  const selectClass =
    'min-h-10 rounded-xl border border-solid border-secondary bg-primary px-3 text-sm text-primary'

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Audit log</h1>
          <p className="text-sm text-tertiary">
            {filterSummaryLine({
              action: actionIn,
              entityType: entityTypeIn,
              from: fromIn,
              to: toIn,
            })}
            {' — '}
            {result.total} {result.total === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </header>

      <form
        method="GET"
        className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4 md:flex-row md:flex-wrap md:items-end"
      >
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-tertiary">
          Action
          <select name="action" defaultValue={actionIn ?? ''} className={selectClass}>
            <option value="">All</option>
            {AUDIT_LOG_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-tertiary">
          Entity type
          <select
            name="entityType"
            defaultValue={entityTypeIn ?? ''}
            className={selectClass}
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs text-tertiary">
          From
          <input
            type="date"
            name="from"
            defaultValue={fromIn ?? ''}
            className={selectClass}
          />
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs text-tertiary">
          To
          <input
            type="date"
            name="to"
            defaultValue={toIn ?? ''}
            className={selectClass}
          />
        </label>
        <input type="hidden" name="page" value="1" />
        <Button type="submit" color="secondary">
          Filter
        </Button>
      </form>

      {result.entries.length === 0 ? (
        <EmptyState title="No audit entries" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-solid border-secondary">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-solid border-secondary bg-secondary">
                  <th className="p-3 font-medium text-tertiary">
                    When
                  </th>
                  <th className="p-3 font-medium text-tertiary">
                    Action
                  </th>
                  <th className="p-3 font-medium text-tertiary">
                    Entity
                  </th>
                  <th className="p-3 font-medium text-tertiary">
                    User
                  </th>
                  <th className="p-3 font-medium text-tertiary">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-solid border-secondary last:border-b-0"
                  >
                    <td className="whitespace-nowrap p-3 align-top text-primary">
                      {whenFormatter.format(row.createdAt)}
                    </td>
                    <td className="p-3 align-top">
                      <Badge size="sm" color="gray" type="modern">
                        {row.action}
                      </Badge>
                    </td>
                    <td className="p-3 align-top text-primary">
                      {row.entityType} · {shortEntityId(row.entityId)}
                    </td>
                    <td className="p-3 align-top text-primary">
                      {row.userId == null ? (
                        <span className="text-tertiary">
                          system
                        </span>
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          <span>{row.userName ?? row.userEmail ?? row.userId}</span>
                          {row.userName && row.userEmail ? (
                            <span className="text-xs text-tertiary">
                              {row.userEmail}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[14rem] p-3 align-top">
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-tertiary">
                        {formatDetailsPreview(row.details)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            className="flex items-center justify-between gap-2 border-t border-solid border-secondary pt-4"
            aria-label="Audit log pagination"
          >
            {result.page > 1 && prevHref ? (
              <Button href={prevHref} color="tertiary" size="sm">
                Previous
              </Button>
            ) : (
              <Button color="tertiary" size="sm" isDisabled>
                Previous
              </Button>
            )}
            <span className="text-sm text-tertiary">
              Page {result.page}
            </span>
            {result.hasMore && nextHref ? (
              <Button href={nextHref} color="tertiary" size="sm">
                Next
              </Button>
            ) : (
              <Button color="tertiary" size="sm" isDisabled>
                Next
              </Button>
            )}
          </nav>
        </>
      )}
    </>
  )
}
