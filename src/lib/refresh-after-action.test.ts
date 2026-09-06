import { describe, expect, it, vi } from 'vitest'

import {
  refreshAfterAction,
  runStaffAction,
} from '@/lib/refresh-after-action'

describe('refreshAfterAction', () => {
  it('invokes refresh', () => {
    const refresh = vi.fn()
    refreshAfterAction(refresh)
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

describe('runStaffAction', () => {
  it('runs onSuccess and refresh after a resolved action', async () => {
    const action = vi.fn(async () => 'ok')
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const refresh = vi.fn()
    const startTransition = vi.fn((cb: () => void) => cb())

    runStaffAction({
      startTransition,
      action,
      onSuccess,
      onError,
      refresh,
    })

    expect(startTransition).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('ok')
      expect(refresh).toHaveBeenCalledTimes(1)
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('runs onError and skips refresh when the action rejects', async () => {
    const err = new Error('boom')
    const action = vi.fn(async () => {
      throw err
    })
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const refresh = vi.fn()
    const startTransition = vi.fn((cb: () => void) => cb())

    runStaffAction({
      startTransition,
      action,
      onSuccess,
      onError,
      refresh,
    })

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err)
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
