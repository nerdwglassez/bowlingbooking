'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/base/buttons/button'
import { unblockLanes } from '@/lib/actions/staff'

export function UnblockButton({ blockId }: { blockId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      color="tertiary"
      size="sm"
      isLoading={pending}
      onClick={() =>
        startTransition(async () => {
          await unblockLanes(blockId)
          router.refresh()
        })
      }
    >
      Remove
    </Button>
  )
}
