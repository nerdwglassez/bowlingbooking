// /admin/reports — read-only analytics (ADMIN-only via `getReportsSummary`).

import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getReportsSummary, type ReportsRange } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

import { KpiTiles } from './kpi-tiles'
import { ReportsCharts } from './reports-charts'

type PageProps = {
  searchParams: Promise<{ range?: string }>
}

const rangeLabel: Record<ReportsRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

function rangeHref(r: ReportsRange): string {
  return r === '30d' ? '/admin/reports' : `/admin/reports?range=${r}`
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const { range: rangeParam } = await searchParams
  const tenant = await getTenant()
  const summary = await getReportsSummary(tenant.id, rangeParam)
  const range = summary.range

  const rangeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  })
  const windowLine = `${rangeFormatter.format(summary.startDate)} – ${rangeFormatter.format(summary.endDate)}`

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-8 w-8 text-[var(--color-text-secondary)]"
              aria-hidden
            />
            <h1 className="text-2xl text-[var(--color-text)]">Reports</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {rangeLabel[range]} · {windowLine}
          </p>
        </div>

        <div
          className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-1"
          role="group"
          aria-label="Report range"
        >
          {(['7d', '30d', '90d'] as const).map((r) => (
            <Button
              key={r}
              asChild
              variant={range === r ? 'primary' : 'ghost'}
              size="sm"
            >
              <Link href={rangeHref(r)} scroll={false}>
                {r === '7d' ? '7d' : r === '30d' ? '30d' : '90d'}
              </Link>
            </Button>
          ))}
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-6">
        <KpiTiles kpi={summary.kpi} />
        <ReportsCharts daily={summary.daily} topPackages={summary.topPackages} />
      </div>
    </>
  )
}
