'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ReportsDailyPoint, ReportsTopPackage } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'
import { Card, CardBody, CardHeader } from '@/components/ui/card'

const tooltipBox = {
  backgroundColor: 'var(--surface-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
}

const tooltipLabel = {
  color: 'var(--color-text-secondary)',
}

const axisTick = { fill: 'var(--color-text-secondary)', fontSize: 11 }
const axisLine = { stroke: 'var(--color-border)' }

interface Props {
  daily: ReportsDailyPoint[]
  topPackages: ReportsTopPackage[]
}

export function ReportsCharts({ daily, topPackages }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Card variant="flat">
        <CardHeader>
          <h2 className="text-lg text-[var(--color-text)]">Revenue by day</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Gross revenue from paid bookings (cents aggregated per UTC day in
            v1).
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={axisLine}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={axisLine}
                  tickFormatter={(v) => formatPrice(Number(v))}
                  width={72}
                />
                <Tooltip
                  contentStyle={tooltipBox}
                  labelStyle={tooltipLabel}
                  formatter={(value) => [
                    formatPrice(Number(value ?? 0)),
                    'Revenue',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenueCents"
                  name="Revenue"
                  stroke="var(--color-action)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-action)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card variant="flat">
        <CardHeader>
          <h2 className="text-lg text-[var(--color-text)]">Bookings by day</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Paid CONFIRMED and COMPLETED bookings per day.
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={axisLine}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={axisLine}
                  width={40}
                />
                <Tooltip
                  contentStyle={tooltipBox}
                  labelStyle={tooltipLabel}
                  formatter={(value) => [String(value ?? 0), 'Bookings']}
                />
                <Bar
                  dataKey="bookingCount"
                  name="Bookings"
                  fill="var(--color-action)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card variant="flat">
        <CardHeader>
          <h2 className="text-lg text-[var(--color-text)]">Top packages</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Top five by gross revenue in this window.
          </p>
        </CardHeader>
        <CardBody className="pt-0">
          {topPackages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No package revenue in this range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    <th className="py-2 pr-4 font-medium">Package</th>
                    <th className="py-2 pr-4 font-medium">Bookings</th>
                    <th className="py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topPackages.map((row) => (
                    <tr
                      key={row.packageId}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="py-2 pr-4 text-[var(--color-text)]">
                        {row.packageName}
                      </td>
                      <td className="py-2 pr-4 text-[var(--color-text-secondary)]">
                        {row.bookingCount}
                      </td>
                      <td className="py-2 text-[var(--color-text)]">
                        {formatPrice(row.revenueCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
