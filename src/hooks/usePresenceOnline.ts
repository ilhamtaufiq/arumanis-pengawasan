import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getPresenceOnline } from '@/lib/api'

export const PRESENCE_ONLINE_POLL_MS = 30_000

export function usePresenceOnline() {
  return useQuery({
    queryKey: queryKeys.presence.online(),
    queryFn: getPresenceOnline,
    refetchInterval: PRESENCE_ONLINE_POLL_MS,
  })
}