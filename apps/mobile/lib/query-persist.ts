import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

export const QUERY_PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24
export const QUERY_PERSIST_GC_TIME_MS = QUERY_PERSIST_MAX_AGE_MS
export const QUERY_PERSIST_BUSTER = 'v1'
/** Throttle penulisan cache agar tab switch tidak memblokir UI thread. */
export const QUERY_PERSIST_THROTTLE_MS = 30_000

const PEKERJAAN_PERSIST_SCOPES = new Set([
  'detail',
  'list',
  'progress-estimasi',
  'penerima',
])

export function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length < 2) return false

  const [root, scope] = queryKey
  if (root === 'auth' && scope === 'me') return true
  if (root === 'pekerjaan' && typeof scope === 'string' && PEKERJAAN_PERSIST_SCOPES.has(scope)) {
    return true
  }
  if (root === 'tiket' && scope === 'list') return true

  return false
}

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'pengawas-query-cache',
  throttleTime: QUERY_PERSIST_THROTTLE_MS,
})

export async function removePersistedQueryCache(): Promise<void> {
  await asyncStoragePersister.removeClient()
}