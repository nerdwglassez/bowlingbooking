'use client'

import { Badge } from '@/components/base/badges/badges'
import type { BlockedSlotRow } from '@/lib/actions/staff'
import {
  formatBlockListDate,
  formatBlockScopeBadge,
  formatLanePill,
} from '@/lib/schedule-display'

export type ScheduleBlocksListProps = {
  blocks: BlockedSlotRow[]
  canManageBlocks: boolean
  onSelectBlock?: (blockId: string) => void
}

function splitBlocks(blocks: BlockedSlotRow[]): {
  upcoming: BlockedSlotRow[]
  past: BlockedSlotRow[]
} {
  const now = Date.now()
  const upcoming: BlockedSlotRow[] = []
  const past: BlockedSlotRow[] = []
  for (const block of blocks) {
    if (block.endTime.getTime() < now) past.push(block)
    else upcoming.push(block)
  }
  return { upcoming, past }
}

export function ScheduleBlocksList({
  blocks,
  canManageBlocks,
  onSelectBlock,
}: ScheduleBlocksListProps) {
  const { upcoming, past } = splitBlocks(blocks)

  return (
    <div className="flex flex-col gap-6">
      <BlockSection
        label="Upcoming"
        blocks={upcoming}
        canManageBlocks={canManageBlocks}
        onSelectBlock={onSelectBlock}
      />
      <BlockSection
        label="Past"
        blocks={past}
        dimmed
        canManageBlocks={canManageBlocks}
        onSelectBlock={onSelectBlock}
      />
    </div>
  )
}

function BlockSection({
  label,
  blocks,
  dimmed = false,
  canManageBlocks,
  onSelectBlock,
}: {
  label: string
  blocks: BlockedSlotRow[]
  dimmed?: boolean
  canManageBlocks: boolean
  onSelectBlock?: (blockId: string) => void
}) {
  if (blocks.length === 0) return null

  return (
    <section className={dimmed ? 'opacity-60' : undefined}>
      <h2 className="pb-2 text-sm font-semibold text-secondary">{label}</h2>
      <ul className="flex flex-col gap-2">
        {blocks.map((block) => {
          const allLanes = block.lanes.length === 0
          const content = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {block.reason ?? 'Lane block'}
                  </p>
                  <p className="mt-0.5 text-xs text-tertiary">
                    {formatBlockListDate(block)}
                  </p>
                </div>
                <Badge
                  size="sm"
                  type="pill-color"
                  color={allLanes ? 'error' : 'gray'}
                >
                  {formatBlockScopeBadge(block.lanes)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge size="sm" color="error" type="pill-color">
                  {allLanes
                    ? 'Whole venue closed'
                    : formatLanePill(block.lanes)}
                </Badge>
                <Badge size="sm" color="gray" type="modern">
                  One time
                </Badge>
              </div>
            </>
          )

          return (
            <li key={block.id}>
              {canManageBlocks && onSelectBlock ? (
                <button
                  type="button"
                  className="w-full min-h-11 rounded-xl bg-primary p-4 text-left shadow-xs ring-1 ring-error/30 ring-inset"
                  onClick={() => onSelectBlock(block.id)}
                >
                  {content}
                </button>
              ) : (
                <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-error/30 ring-inset">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
