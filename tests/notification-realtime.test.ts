import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'

describe('notification realtime invalidate', () => {
  it('marks notification queries stale after invalidate', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.notifications.unread(), { notifications: [], unread_count: 0, pagination: null })
    queryClient.setQueryData(queryKeys.notifications.list(false, 1), { notifications: [], unread_count: 0, pagination: null })

    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })

    expect(queryClient.getQueryState(queryKeys.notifications.unread())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(queryKeys.notifications.list(false, 1))?.isInvalidated).toBe(true)
  })
})