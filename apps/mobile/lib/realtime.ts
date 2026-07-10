import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'

export type PekerjaanUpdatedPayload = {
  pekerjaan_id: number
  resource: string
  action: 'created' | 'updated' | 'deleted' | string
  resource_id?: number | null
  updated_at?: string
}

function isPekerjaanListQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === 'pekerjaan' && queryKey[1] === 'list'
}

function isPekerjaanDetailQuery(queryKey: readonly unknown[], pekerjaanId?: number) {
  if (queryKey[0] !== 'pekerjaan' || queryKey[1] !== 'detail') return false
  if (pekerjaanId == null) return true
  return String(queryKey[2]) === String(pekerjaanId)
}

/**
 * Invalidate cache dari event realtime.
 *
 * Penting: jangan pakai queryKeys.pekerjaan.all untuk event biasa — itu
 * merefetch SEMUA detail/list/penerima/progress sekaligus dan membuat UI lag.
 */
export function invalidatePekerjaanRealtime(
  queryClient: QueryClient,
  payload: PekerjaanUpdatedPayload,
  options?: { scope?: 'detail' | 'global' },
) {
  const pekerjaanId = payload.pekerjaan_id
  const resource = `${payload.resource ?? ''}`.toLowerCase()

  if (options?.scope === 'global' || !pekerjaanId) {
    void queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && isPekerjaanListQuery(query.queryKey),
    })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    return
  }

  // Hanya detail pekerjaan yang sedang aktif di cache observer (layar detail terbuka).
  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) && isPekerjaanDetailQuery(query.queryKey, pekerjaanId),
    refetchType: 'active',
  })

  // List boleh soft-invalidate tanpa force refetch semua observer non-aktif.
  void queryClient.invalidateQueries({
    predicate: (query) => Array.isArray(query.queryKey) && isPekerjaanListQuery(query.queryKey),
    refetchType: 'active',
  })

  if (resource === 'penerima') {
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.pekerjaan.all, 'penerima', String(pekerjaanId)],
      refetchType: 'active',
    })
  }

  if (resource === 'progress') {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'pekerjaan' &&
        query.queryKey[1] === 'progress-estimasi' &&
        String(query.queryKey[2]) === String(pekerjaanId),
      refetchType: 'active',
    })
  }

  if (resource === 'tiket') {
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'tiket' && query.queryKey[1] === 'list',
      refetchType: 'active',
    })
  }
}
