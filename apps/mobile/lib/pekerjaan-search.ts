import type { Pekerjaan, PaginatedResponse } from '@pengawas/shared'
import { getPekerjaanList } from '@/lib/api'
import { buildPekerjaanListParams } from '@/lib/pekerjaan-list-params'
import {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  serverSearchLikelyIgnored,
} from '@/lib/pekerjaan-search-match'

export type { PekerjaanSearchInput } from './pekerjaan-search-types'
export {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  serverSearchLikelyIgnored,
} from '@/lib/pekerjaan-search-match'

import type { PekerjaanSearchInput } from './pekerjaan-search-types'

/** Cache katalog penuh per sesi (per user token scope — di-clear manual). */
let catalogCache: Pekerjaan[] | null = null
let catalogPromise: Promise<Pekerjaan[]> | null = null
let catalogFetchedAt = 0

const CATALOG_TTL_MS = 5 * 60_000

export function clearPekerjaanCatalogCache(): void {
  catalogCache = null
  catalogPromise = null
  catalogFetchedAt = 0
}

function metaLastPage(meta: Record<string, unknown> | undefined, fallback = 1): number {
  const n = Number(meta?.last_page)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

/**
 * Ambil SELURUH pekerjaan yang boleh diakses user (paginate 100/hal).
 * Hasil di-cache di memory agar search berikutnya cepat.
 */
export async function loadFullPekerjaanCatalog(force = false): Promise<Pekerjaan[]> {
  const now = Date.now()
  if (!force && catalogCache && now - catalogFetchedAt < CATALOG_TTL_MS) {
    return catalogCache
  }
  if (!force && catalogPromise) return catalogPromise

  catalogPromise = (async () => {
    const all: Pekerjaan[] = []
    const seen = new Set<number>()
    const perPage = 100
    let page = 1
    let lastPage = 1
    const maxPages = 30

    while (page <= lastPage && page <= maxPages) {
      const res = await getPekerjaanList(
        buildPekerjaanListParams({
          page,
          perPage,
          sortBy: 'created_at',
          sortDirection: 'desc',
        }),
      )

      for (const item of res.data) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        all.push(item)
      }

      lastPage = metaLastPage(res.meta as Record<string, unknown> | undefined, page)
      if (res.data.length === 0) break
      page += 1
    }

    catalogCache = all
    catalogFetchedAt = Date.now()
    if (__DEV__) {
      console.log('[pekerjaan-search] catalog loaded', { count: all.length, pages: page - 1 })
    }
    return all
  })()

  try {
    return await catalogPromise
  } finally {
    catalogPromise = null
  }
}

function paginateLocal(
  items: Pekerjaan[],
  page: number,
  perPage: number,
  extraMeta?: Record<string, unknown>,
): PaginatedResponse<Pekerjaan> {
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1)
  const safePage = Math.min(Math.max(1, page), lastPage)
  const start = (safePage - 1) * perPage
  const slice = items.slice(start, start + perPage)

  return {
    data: slice,
    meta: {
      current_page: safePage,
      last_page: lastPage,
      per_page: perPage,
      total,
      client_catalog: true,
      ...extraMeta,
    },
  }
}

/**
 * Search andal: filter di SELURUH katalog (bukan halaman aktif).
 *
 * - Tanpa keyword/tahun: list server normal (paginasi cepat)
 * - Dengan keyword/tahun: load katalog penuh → filter memory → paginate
 */
export async function fetchPekerjaanListWithSearch(
  input: PekerjaanSearchInput,
): Promise<PaginatedResponse<Pekerjaan>> {
  const q = (input.search || '').trim()
  const tahun = (input.tahun || '').trim()
  const page = Math.max(1, input.page ?? 1)
  const perPage = Math.max(1, input.perPage ?? 12)

  // Mode browse normal — tanpa search
  if (!q && !tahun) {
    return getPekerjaanList(
      buildPekerjaanListParams({
        page,
        perPage,
        sortBy: input.sortBy ?? 'created_at',
        sortDirection: input.sortDirection ?? 'desc',
      }),
    )
  }

  // Mode search: SELALU filter di katalog penuh (andalkan client).
  // Ini memastikan "kubang" dicari di 500+ paket, bukan cuma page 1.
  const catalog = await loadFullPekerjaanCatalog()

  let filtered = catalog
  if (q) {
    filtered = filtered.filter((item) => matchPekerjaanKeyword(item, q))
  }
  if (tahun) {
    filtered = filtered.filter((item) => matchPekerjaanTahun(item, tahun))
  }

  if (__DEV__) {
    console.log('[pekerjaan-search] catalog filter', {
      q,
      tahun,
      catalog: catalog.length,
      matched: filtered.length,
      page,
    })
  }

  // Opsional: coba juga server search untuk log perbandingan (tidak dipakai jika kosong)
  if (q && filtered.length === 0) {
    try {
      const serverRes = await getPekerjaanList(
        buildPekerjaanListParams({
          search: q,
          tahun: tahun || undefined,
          page: 1,
          perPage: 50,
        }),
      )
      if (serverRes.data.length > 0 && !serverSearchLikelyIgnored(q, serverRes)) {
        // Server menemukan sesuatu yang katalog/match kita lewatkan — pakai server
        if (__DEV__) {
          console.log('[pekerjaan-search] using server hits', serverRes.data.length)
        }
        return {
          data: serverRes.data.slice(0, perPage),
          meta: {
            ...(serverRes.meta as object),
            current_page: 1,
            per_page: perPage,
            total: Number((serverRes.meta as { total?: number })?.total ?? serverRes.data.length),
            client_catalog: false,
          },
        }
      }
    } catch {
      // abaikan; tetap pakai hasil catalog
    }
  }

  return paginateLocal(filtered, page, perPage, {
    search: q || undefined,
    tahun: tahun || undefined,
  })
}
