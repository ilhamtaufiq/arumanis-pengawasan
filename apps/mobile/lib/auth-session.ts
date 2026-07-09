import { ApiError } from '@pengawas/api-client'
import type { AuthUser } from '@pengawas/shared'
import { queryKeys } from '@pengawas/shared/query-keys'
import type { QueryClient } from '@tanstack/react-query'

export const AUTH_ME_STALE_TIME_MS = 1000 * 60 * 5
/** Batas tunggu restore cache React Query sebelum app tetap boleh render */
export const QUERY_RESTORE_TIMEOUT_MS = 8_000

export function readAuthErrorStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null
}

export function isSessionInvalidError(error: unknown): boolean {
  const status = readAuthErrorStatus(error)
  return status === 401 || status === 403
}

export function readCachedAuthUser(queryClient: QueryClient): AuthUser | null {
  return queryClient.getQueryData<AuthUser>(queryKeys.auth.me()) ?? null
}