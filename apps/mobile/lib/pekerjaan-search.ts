import type { PaginatedResponse, Pekerjaan } from '@pengawas/shared'
import {
  clearPekerjaanRequestDebug,
  fetchPekerjaanFromApi,
  getLastPekerjaanRequestDebug,
} from '@/lib/pekerjaan-api'
import {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  serverSearchLikelyIgnored,
} from '@/lib/pekerjaan-search-match'
import type { PekerjaanSearchInput } from './pekerjaan-search-types'

export type { PekerjaanSearchInput } from './pekerjaan-search-types'
export {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  serverSearchLikelyIgnored,
  serverIgnoredSearch,
} from '@/lib/pekerjaan-search-match'

export type PekerjaanSearchDebug = {
  queryString: string
  url?: string
  search?: string
  tahun?: string
  page: number
  perPage: number
  rows: number
  total: number
  mode: 'server' | 'client-catalog' | 'browse'
  at: string
  fallbackSkipped?: string
}

let lastDebug: PekerjaanSearchDebug | null = null
let catalogCache: Pekerjaan[] | null = null
let catalogPromise: Promise<Pekerjaan[]> | null = null
let catalogFetchedAt = 0
const CATALOG_TTL_MS = 5 * 60_000
/** Hard cap: jangan storm API dengan puluhan page. */
const CATALOG_MAX_PAGES = 5
const CATALOG_PER_PAGE = 100

export function getLastPekerjaanSearchDebug(): PekerjaanSearchDebug | null {
  return lastDebug ?? mapRequestDebug()
}

function mapRequestDebug(): PekerjaanSearchDebug | null {
  const d = getLastPekerjaanRequestDebug()
  if (!d) return null
  return {
    queryString: d.queryString,
    url: d.url,
    search: d.search,
    page: d.page,
    perPage: d.perPage,
    rows: d.rows,
    total: d.total,
    mode: d.search ? 'server' : 'browse',
    at: d.at,
  }
}

export function clearPekerjaanCatalogCache(): void {
  lastDebug = null
  catalogCache = null
  catalogPromise = null
  catalogFetchedAt = 0
  clearPekerjaanRequestDebug()
}

function metaNum(meta: Record<string, unknown> | undefined, key: string, fallback = 0): number {
  const n = Number(meta?.[key])
  return Number.isFinite(n) ? n : fallback
}

async function loadPekerjaanCatalogSlice(
  options: { tahun?: string; force?: boolean } = {},
): Promise<Pekerjaan[]> {
  const tahun = options.tahun?.trim() || undefined
  const now = Date.now()
  // Cache hanya untuk catalog tanpa tahun (fallback terberat); dengan tahun selalu bounded.
  if (
    !tahun &&
    !options.force &&
    catalogCache &&
    now - catalogFetchedAt < CATALOG_TTL_MS
  ) {
    return catalogCache
  }
  if (!tahun && !options.force && catalogPromise) return catalogPromise

  const run = (async () => {
    const all: Pekerjaan[] = []
    const seen = new Set<number>()
    let page = 1
    let lastPage = 1
    while (page <= lastPage && page <= CATALOG_MAX_PAGES) {
      const res = await fetchPekerjaanFromApi({
        page,
        perPage: CATALOG_PER_PAGE,
        tahun,
        sortBy: 'created_at',
        sortDirection: 'desc',
      })
      for (const item of res.data) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        all.push(item)
      }
      lastPage = Math.max(1, metaNum(res.meta as Record<string, unknown>, 'last_page', page))
      if (res.data.length === 0) break
      page += 1
    }
    if (!tahun) {
      catalogCache = all
      catalogFetchedAt = Date.now()
    }
    return all
  })()

  if (!tahun) catalogPromise = run

  try {
    return await run
  } finally {
    if (!tahun) catalogPromise = null
  }
}

function paginateLocal(
  items: Pekerjaan[],
  page: number,
  perPage: number,
  info: { search?: string; tahun?: string; note: string },
): PaginatedResponse<Pekerjaan> {
  const total = items.length
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1)
  const safePage = Math.min(Math.max(1, page), lastPage)
  const start = (safePage - 1) * perPage
  const slice = items.slice(start, start + perPage)

  lastDebug = {
    queryString: info.note,
    search: info.search,
    tahun: info.tahun,
    page: safePage,
    perPage,
    rows: slice.length,
    total,
    mode: 'client-catalog',
    at: new Date().toISOString(),
  }

  return {
    data: slice,
    meta: {
      current_page: safePage,
      last_page: lastPage,
      per_page: perPage,
      total,
      client_catalog: true,
      catalog_capped: true,
    },
  }
}

/**
 * Search lewat live API.
 * Fallback katalog hanya jika API terbukti mengabaikan search — dan dibatasi max 5 page.
 */
export async function fetchPekerjaanListWithSearch(
  input: PekerjaanSearchInput,
): Promise<PaginatedResponse<Pekerjaan>> {
  const search = (input.search || '').trim() || undefined
  const tahun = (input.tahun || '').trim() || undefined
  const page = Math.max(1, input.page ?? 1)
  const perPage = Math.max(1, Math.min(100, input.perPage ?? 12))

  const res = await fetchPekerjaanFromApi({
    search,
    tahun,
    page,
    perPage,
    sortBy: input.sortBy ?? 'created_at',
    sortDirection: input.sortDirection ?? 'desc',
  })

  const req = getLastPekerjaanRequestDebug()
  const total = metaNum(res.meta as Record<string, unknown>, 'total', res.data.length)

  lastDebug = {
    queryString: req?.queryString || '',
    url: req?.url,
    search,
    tahun,
    page,
    perPage,
    rows: res.data.length,
    total,
    mode: search || tahun ? 'server' : 'browse',
    at: new Date().toISOString(),
  }

  if (!search || !serverSearchLikelyIgnored(search, res)) {
    return res
  }

  // Tahun aktif sudah memotong dataset di server — fallback penuh sering false positive.
  // Tetap izinkan fallback terbatas (≤5 page) dengan filter tahun bila ada.
  try {
    const catalog = await loadPekerjaanCatalogSlice({ tahun })
    let filtered = catalog.filter((item) => matchPekerjaanKeyword(item, search))
    if (tahun) filtered = filtered.filter((item) => matchPekerjaanTahun(item, tahun))
    return paginateLocal(filtered, page, perPage, {
      search,
      tahun,
      note: `${req?.queryString || ''} [fallback-catalog n=${catalog.length} maxPages=${CATALOG_MAX_PAGES}]`,
    })
  } catch {
    lastDebug = {
      ...lastDebug,
      fallbackSkipped: 'catalog-load-failed',
    }
    return res
  }
}
