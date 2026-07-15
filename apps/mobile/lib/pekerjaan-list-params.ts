/**
 * Pure builders for pekerjaan list API params — unit-testable without React.
 */

export type PekerjaanListQueryInput = {
  search?: string
  tahun?: string
  page?: number
  perPage?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

/** Params dikirim ke GET /pekerjaan — harus include `search` bila non-empty. */
export function buildPekerjaanListParams(input: PekerjaanListQueryInput): Record<string, string | number> {
  const params: Record<string, string | number> = {
    per_page: input.perPage ?? 5,
    page: Math.max(1, input.page ?? 1),
    sort_by: input.sortBy ?? 'created_at',
    sort_direction: input.sortDirection ?? 'desc',
  }

  const search = input.search?.trim()
  if (search) params.search = search

  const tahun = input.tahun?.trim()
  if (tahun) params.tahun = tahun

  return params
}

/**
 * Saat keyword search/tahun berubah, page query HARUS 1 (bukan page list sebelumnya).
 * Bug lama: effect setPage(1) async → 1 request salah dengan page lama.
 */
export function resolveListPageForFilter(args: {
  page: number
  filterKey: string
  prevFilterKey: string
}): { pageForQuery: number; filterChanged: boolean } {
  const filterChanged = args.filterKey !== args.prevFilterKey
  return {
    filterChanged,
    pageForQuery: filterChanged ? 1 : Math.max(1, args.page),
  }
}
