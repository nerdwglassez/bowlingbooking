'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { unblockLanes } from '@/lib/actions/staff'

export function UnblockButton({ blockId }: { blockId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
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
