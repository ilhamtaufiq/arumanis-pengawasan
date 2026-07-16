/**
 * Pure builders for GET /pekerjaan — unit-testable without React.
 *
 * Backend contract (PekerjaanController::index):
 *   search, tahun, page, per_page, sort_by, sort_direction
 */

export type PekerjaanListQueryInput = {
  search?: string
  tahun?: string
  page?: number
  perPage?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

/** Params dikirim ke GET /pekerjaan. `search` hanya di-set bila non-empty. */
export function buildPekerjaanListParams(
  input: PekerjaanListQueryInput,
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: Math.max(1, input.page ?? 1),
    per_page: Math.max(1, Math.min(100, input.perPage ?? 5)),
    sort_by: input.sortBy ?? 'created_at',
    sort_direction: input.sortDirection ?? 'desc',
  }

  const search = input.search?.trim()
  if (search) {
    params.search = search
  }

  const tahun = input.tahun?.trim()
  if (tahun) {
    params.tahun = tahun
  }

  return params
}

/** Build query string for logging / tests (order: search first when present). */
export function buildPekerjaanListQueryString(input: PekerjaanListQueryInput): string {
  const params = buildPekerjaanListParams(input)
  const sp = new URLSearchParams()
  // Prefer search first so logs/screenshots clearly show it
  if (params.search != null) sp.set('search', String(params.search))
  if (params.tahun != null) sp.set('tahun', String(params.tahun))
  sp.set('page', String(params.page))
  sp.set('per_page', String(params.per_page))
  sp.set('sort_by', String(params.sort_by))
  sp.set('sort_direction', String(params.sort_direction))
  return sp.toString()
}
