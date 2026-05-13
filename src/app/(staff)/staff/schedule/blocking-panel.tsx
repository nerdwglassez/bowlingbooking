'use client'

// BlockingPanel — client island holding the LaneBlockingForm state and
// dispatching the blockLanes server action.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  LaneBlockingForm,
  type LaneBlockingFormValues,
} from '@/components/patterns/lane-blocking-form'
import { Card, CardBody } from '@/components/ui/card'
import { blockLanes } from '@/lib/actions/staff'

interface BlockingPanelProps {
  dateISO: string
  tenantId: string
}

function defaultValues(dateISO: string): LaneBlockingFormValues {
  const start = `${dateISO}T18:00`
  const end = `${dateISO}T20:00`
  return { startTime: start, endTime: end, lanes: '', reason: '' }
}

function parseLanes(input: string): number[] {
  return input
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

export function BlockingPanel({ dateISO, tenantId }: BlockingPanelProps) {
  const router = useRouter()
  const [values, setValues] = useState(defaultValues(dateISO))
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    const start = new Date(values.startTime)
    const end = new Date(values.endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Provide valid start and end times.')
      return
    }
    if (end <= start) {
      setError('End must be after start.')
      return
    }
    startTransition(async () => {
      try {
        await blockLanes({
          tenantId,
          startTime: start,
          endTime: end,
          lanes: parseLanes(values.lanes),
          reason: values.reason || undefined,
        })
        setValues(defaultValues(dateISO))
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not create block.',
        )
      }
    })
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <h2 className="text-lg">Block lanes</h2>
        <LaneBlockingForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      </CardBody>
    </Card>
  )
}
