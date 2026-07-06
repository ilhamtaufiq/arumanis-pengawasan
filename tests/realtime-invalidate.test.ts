import { describe, expect, it } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { invalidatePekerjaanRealtime } from '../apps/mobile/lib/realtime'

describe('invalidatePekerjaanRealtime', () => {
  it('marks pekerjaan detail stale on foto update', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.pekerjaan.detail('421'), { id: 421 })

    invalidatePekerjaanRealtime(
      queryClient,
      { pekerjaan_id: 421, resource: 'foto', action: 'created' },
      { scope: 'detail' },
    )

    expect(queryClient.getQueryState(queryKeys.pekerjaan.detail('421'))?.isInvalidated).toBe(true)
  })

  it('marks list queries stale on global update', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.pekerjaan.list({ page: 1 }), { data: [] })

    invalidatePekerjaanRealtime(
      queryClient,
      { pekerjaan_id: 421, resource: 'foto', action: 'deleted' },
      { scope: 'global' },
    )

    expect(queryClient.getQueryState(queryKeys.pekerjaan.list({ page: 1 }))?.isInvalidated).toBe(true)
  })
})