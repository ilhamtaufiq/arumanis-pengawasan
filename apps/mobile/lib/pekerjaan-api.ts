/**
 * GET /pekerjaan — request eksplisit (bukan lewat createApiClient path builder)
 * agar query `search` / `page` / `per_page` pasti sampai ke live API.
 */
import type { PaginatedResponse, Pekerjaan } from '@pengawas/shared'
import { getApiBaseUrl } from '@/lib/config'
import { ensureSessionToken, getSessionTokenSync } from '@/lib/session'
import {
  buildPekerjaanListParams,
  buildPekerjaanListQueryString,
  type PekerjaanListQueryInput,
} from '@/lib/pekerjaan-list-params'

export type PekerjaanRequestDebug = {
  url: string
  queryString: string
  status: number
  total: number
  rows: number
  search?: string
  page: number
  perPage: number
  at: string
}

let lastRequestDebug: PekerjaanRequestDebug | null = null

export function getLastPekerjaanRequestDebug(): PekerjaanRequestDebug | null {
  return lastRequestDebug
}

export function clearPekerjaanRequestDebug(): void {
  lastRequestDebug = null
}

export async function fetchPekerjaanFromApi(
  input: PekerjaanListQueryInput,
): Promise<PaginatedResponse<Pekerjaan>> {
  const params = buildPekerjaanListParams(input)
  const queryString = buildPekerjaanListQueryString(input)
  const base = getApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/pekerjaan?${queryString}`

  const token = getSessionTokenSync() ?? (await ensureSessionToken())
  if (!token) {
    throw new Error('Belum login — token kosong.')
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      // Dual operator+pengawas: filter assign (sama seperti panel web)
      'X-Arumanis-App': 'mobile',
    },
  })

  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null

  if (!res.ok) {
    const msg =
      (payload && typeof payload.message === 'string' && payload.message) ||
      `Gagal memuat pekerjaan (${res.status})`
    throw new Error(msg)
  }

  const data = Array.isArray(payload?.data) ? (payload!.data as Pekerjaan[]) : []
  const meta =
    payload?.meta && typeof payload.meta === 'object'
      ? (payload.meta as Record<string, unknown>)
      : undefined

  const total = Number(meta?.total ?? data.length)

  lastRequestDebug = {
    url,
    queryString,
    status: res.status,
    total: Number.isFinite(total) ? total : data.length,
    rows: data.length,
    search: input.search?.trim() || undefined,
    page: Number(params.page) || 1,
    perPage: Number(params.per_page) || 5,
    at: new Date().toISOString(),
  }

  if (__DEV__) {
    console.log('[pekerjaan-api]', lastRequestDebug)
  }

  return {
    data,
    meta: meta as PaginatedResponse<Pekerjaan>['meta'],
    links: (payload?.links as PaginatedResponse<Pekerjaan>['links']) ?? undefined,
  }
}
