'use client'
'use no memo'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Clock3 } from 'lucide-react'
import { BookingStatusPill, getBookingStatusPill } from '@/components/shared/status/StatusPill'
import ManagementRowActionsMenu from '@/components/shared/management/ManagementRowActionsMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/ui/table'
import { cn } from '@/lib/utils'
import { formatTime12Hour } from '@/lib/time'
import { getBookingLanes } from '@/lib/staff-booking-utils'

type BookingRow = {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  numBowlers: number
  status: string
  totalPrice?: number
  lanes?: string | null
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages?: Array<{
    package?: {
      name?: string | null
    } | null
  }>
}

type BookingRowAction = {
  key: string
  label: string
  onClick: () => void
  className?: string
}

type StaffBookingsTableProps = {
  rows: BookingRow[]
  getCustomerDisplayName: (booking: BookingRow) => string
  getSecondaryBookingDetail: (booking: BookingRow) => string
  getRowActions: (booking: BookingRow) => BookingRowAction[]
  openActionsForId: string | null
  onActionsOpenChange: (bookingId: string, nextOpen: boolean) => void
}

const columnClassNames =
  'group-[.staff-table]/row:grid-cols-1 group-[.staff-table]/row:gap-3 md:group-[.staff-table]/row:grid md:group-[.staff-table]/row:grid-cols-[180px_1fr_190px_220px_170px] md:group-[.staff-table]/row:items-center'

export default function StaffBookingsTable({
  rows,
  getCustomerDisplayName,
  getSecondaryBookingDetail,
  getRowActions,
  openActionsForId,
  onActionsOpenChange,
}: StaffBookingsTableProps) {
  const columns = useMemo<ColumnDef<BookingRow>[]>(
    () => [
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock3 className="h-4 w-4 text-slate-500" />
            {formatTime12Hour(row.original.startTime)}
          </div>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-slate-900">{getCustomerDisplayName(row.original)}</p>
            <p className="text-sm text-slate-500">{getSecondaryBookingDetail(row.original)}</p>
          </div>
        ),
      },
      {
        id: 'lanes',
        header: 'Lanes',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {getBookingLanes(row.original).map((lane) => (
              <span
                key={`${row.original.id}-${lane}`}
                className="inline-flex rounded-[10px] bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600"
              >
                {lane}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const pill = getBookingStatusPill(row.original.status, { context: 'staff-dashboard' })
          return (
            <BookingStatusPill
              status={row.original.status}
              context="staff-dashboard"
              className={pill.className}
              label={pill.label}
            />
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-start">
            <ManagementRowActionsMenu
              menuId={row.original.id}
              triggerLabel={`Open actions for booking at ${formatTime12Hour(row.original.startTime)}`}
              actions={getRowActions(row.original)}
              isOpen={openActionsForId === row.original.id}
              onOpenChange={(nextOpen) => onActionsOpenChange(row.original.id, nextOpen)}
            />
          </div>
        ),
      },
    ],
    [getCustomerDisplayName, getSecondaryBookingDetail, getRowActions, openActionsForId, onActionsOpenChange]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="staff-table">
      <Table>
        <TableHeader className="hidden md:table-header-group">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-gradient-to-r from-slate-50 to-slate-100/60 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'px-6 py-4 text-sm font-semibold text-slate-500',
                    header.column.id === 'time' && 'w-[180px]',
                    header.column.id === 'customer' && 'w-[calc(100%-760px)]',
                    header.column.id === 'lanes' && 'w-[190px]',
                    header.column.id === 'status' && 'w-[220px]',
                    header.column.id === 'actions' && 'w-[170px]'
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow
              key={row.id}
              className={cn(
                'group/row border-b border-slate-200/60 px-6 py-5 hover:bg-transparent',
                index % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
              )}
            >
              <TableCell className={cn('p-0', columnClassNames)}>
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className={cn(
                      'px-6 py-2 md:px-0 md:py-0',
                      cell.column.id === 'actions' && 'pb-4 md:pb-0'
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
