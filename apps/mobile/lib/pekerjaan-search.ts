import type { PaginatedResponse, Pekerjaan } from '@pengawas/shared'
import {
  clearPekerjaanRequestDebug,
  fetchPekerjaanFromApi,
  getLastPekerjaanRequestDebug,
} from '@/lib/pekerjaan-api'
import {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
} from '@/lib/pekerjaan-search-match'
import type { PekerjaanSearchInput } from './pekerjaan-search-types'

export type { PekerjaanSearchInput } from './pekerjaan-search-types'
export {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  serverSearchLikelyIgnored,
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
}

let lastDebug: PekerjaanSearchDebug | null = null
let catalogCache: Pekerjaan[] | null = null
let catalogPromise: Promise<Pekerjaan[]> | null = null
let catalogFetchedAt = 0
const CATALOG_TTL_MS = 3 * 60_000

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

/** Live API terbukti memfilter; deteksi jika response masih “penuh” tanpa match. */
function serverIgnoredSearch(search: string, res: PaginatedResponse<Pekerjaan>): boolean {
  if (!search.trim()) return false
  const total = metaNum(res.meta as Record<string, unknown>, 'total', res.data.length)
  if (res.data.length === 0) return total > 100
  const matches = res.data.filter((i) => matchPekerjaanKeyword(i, search))
  if (matches.length === 0 && total > 50) return true
  if (total > 100 && matches.length / res.data.length < 0.25) return true
  return false
}

async function loadFullPekerjaanCatalog(force = false): Promise<Pekerjaan[]> {
  const now = Date.now()
  if (!force && catalogCache && now - catalogFetchedAt < CATALOG_TTL_MS) return catalogCache
  if (!force && catalogPromise) return catalogPromise

  catalogPromise = (async () => {
    const all: Pekerjaan[] = []
    const seen = new Set<number>()
    let page = 1
    let lastPage = 1
    while (page <= lastPage && page <= 40) {
      const res = await fetchPekerjaanFromApi({
        page,
        perPage: 100,
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
    catalogCache = all
    catalogFetchedAt = Date.now()
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
    },
  }
}

/**
 * Search lewat live API (fetch URL eksplisit).
 * Fallback katalog hanya jika API mengabaikan search (deteksi total tetap penuh).
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

  // Live probe: search=kubang → total 7. Jika dapat total ~558 + tidak ada match → fallback.
  if (search && serverIgnoredSearch(search, res)) {
    const catalog = await loadFullPekerjaanCatalog()
    let filtered = catalog.filter((item) => matchPekerjaanKeyword(item, search))
    if (tahun) filtered = filtered.filter((item) => matchPekerjaanTahun(item, tahun))
    return paginateLocal(filtered, page, perPage, {
      search,
      tahun,
      note: `${req?.queryString || ''} [fallback-catalog n=${catalog.length}]`,
    })
  }

  return res
}
