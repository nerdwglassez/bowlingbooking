'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/base/buttons/button'
import { unblockLanes } from '@/lib/actions/staff'
import { runStaffAction } from '@/lib/refresh-after-action'

export function UnblockButton({ blockId }: { blockId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      color="tertiary"
      size="sm"
      isLoading={pending}
      onClick={() =>
        runStaffAction({
          startTransition,
          action: () => unblockLanes(blockId),
          refresh: () => router.refresh(),
        })
      }
    >
      Remove
    </Button>
  )
}
