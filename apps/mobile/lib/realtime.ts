import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'

export type PekerjaanUpdatedPayload = {
  pekerjaan_id: number
  resource: string
  action: 'created' | 'updated' | 'deleted' | string
  resource_id?: number | null
  updated_at?: string
}

export function invalidatePekerjaanRealtime(
  queryClient: QueryClient,
  payload: PekerjaanUpdatedPayload,
  options?: { scope?: 'detail' | 'global' },
) {
  const pekerjaanId = payload.pekerjaan_id
  const resource = payload.resource.toLowerCase()

  if (options?.scope === 'global' || !pekerjaanId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    return
  }

  void queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.detail(pekerjaanId) })

  if (resource === 'penerima') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.penerima(pekerjaanId) })
  }

  if (resource === 'progress') {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'pekerjaan' &&
        query.queryKey[1] === 'progress-estimasi' &&
        query.queryKey[2] === pekerjaanId,
    })
  }

  if (resource === 'tiket') {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'tiket' && query.queryKey[1] === 'list',
    })
  }
}