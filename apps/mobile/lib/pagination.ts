export const DEFAULT_PAGE_SIZE = 10
export const FOTO_MATRIX_PAGE_SIZE = 4

export type PaginationMeta = {
  currentPage: number
  lastPage: number
  total: number
  perPage: number
}

export function readPaginationMeta(
  meta: Record<string, unknown> | undefined,
  fallback: { page: number; perPage: number; total: number },
): PaginationMeta {
  if (meta && (meta.current_page != null || meta.last_page != null || meta.total != null)) {
    const perPage = Number(meta.per_page || fallback.perPage)
    const total = Number(meta.total ?? fallback.total)
    const lastPage = Number(meta.last_page || Math.max(1, Math.ceil(total / Math.max(perPage, 1))))
    return {
      currentPage: Number(meta.current_page || fallback.page),
      lastPage,
      total,
      perPage,
    }
  }

  const lastPage = Math.max(1, Math.ceil(fallback.total / Math.max(fallback.perPage, 1)))
  return {
    currentPage: fallback.page,
    lastPage,
    total: fallback.total,
    perPage: fallback.perPage,
  }
}

export function paginateSlice<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}