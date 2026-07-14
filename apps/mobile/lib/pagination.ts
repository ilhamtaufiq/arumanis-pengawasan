export const DEFAULT_PAGE_SIZE = 10
export const FOTO_MATRIX_PAGE_SIZE = 4

export type PaginationMeta = {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
}

function toPositiveInt(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.floor(n)
}

function toNonNegInt(value: unknown, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.floor(n)
}

/**
 * Baca meta paginasi Laravel Resource (`meta.current_page`, …).
 * Fallback total jangan pakai panjang array 1 halaman — itu bikin last_page selalu 1.
 */
export function readPaginationMeta(
  meta: Record<string, unknown> | undefined,
  fallback: { page: number; perPage: number; total: number },
): PaginationMeta {
  if (meta && (meta.current_page != null || meta.last_page != null || meta.total != null)) {
    const perPage = toPositiveInt(meta.per_page, fallback.perPage)
    const total = toNonNegInt(meta.total, fallback.total)
    const currentPage = toPositiveInt(meta.current_page, fallback.page)
    const lastPage = toPositiveInt(
      meta.last_page,
      Math.max(1, Math.ceil(total / Math.max(perPage, 1)) || 1),
    )
    return {
      currentPage,
      lastPage: Math.max(1, lastPage),
      total,
      perPage,
    }
  }

  const perPage = toPositiveInt(fallback.perPage, 5)
  const total = toNonNegInt(fallback.total, 0)
  const lastPage = Math.max(1, total > 0 ? Math.ceil(total / perPage) : 1)
  return {
    currentPage: toPositiveInt(fallback.page, 1),
    lastPage,
    total,
    perPage,
  }
}

export function paginateSlice<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}