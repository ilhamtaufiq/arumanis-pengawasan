import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getPekerjaanList } from '@/lib/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { readPaginationMeta } from '@/lib/pagination'

export const PEKERJAAN_LIST_PER_PAGE = 5
export const SEARCH_DEBOUNCE_MS = 400

type UseServerPekerjaanListOptions = {
  enabled: boolean
  /** Default 5 — admin & pengawas sama: server-side only. */
  perPage?: number
  /** Keep previous page data saat ganti halaman (bukan saat ganti search). */
  keepPagePlaceholder?: boolean
}

/**
 * List pekerjaan 100% server-side: search + tahun + page.
 * Search selalu dari seluruh dataset (bukan hanya halaman aktif).
 * Saat keyword berubah, page dipaksa 1 di render yang sama (tanpa race).
 */
export function useServerPekerjaanList(options: UseServerPekerjaanListOptions) {
  const perPage = options.perPage ?? PEKERJAAN_LIST_PER_PAGE
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const [page, setPage] = useState(1)
  const [prevSearch, setPrevSearch] = useState('')
  const [prevTahun, setPrevTahun] = useState('')

  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedTahun = useDebouncedValue(tahun.trim(), SEARCH_DEBOUNCE_MS)

  // Reset page sinkron saat filter debounced berubah (hindari query search+page lama)
  let pageForQuery = page
  if (debouncedSearch !== prevSearch || debouncedTahun !== prevTahun) {
    setPrevSearch(debouncedSearch)
    setPrevTahun(debouncedTahun)
    pageForQuery = 1
    if (page !== 1) {
      setPage(1)
    }
  }

  const searchPending =
    search.trim() !== debouncedSearch || tahun.trim() !== debouncedTahun

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      tahun: debouncedTahun || undefined,
      page: pageForQuery,
      per_page: perPage,
      source: 'server-list' as const,
    }),
    [debouncedSearch, debouncedTahun, pageForQuery, perPage],
  )

  const filterKey = `${debouncedSearch}|${debouncedTahun}`

  const query = useQuery({
    queryKey: queryKeys.pekerjaan.list(listFilters),
    queryFn: () =>
      getPekerjaanList({
        per_page: perPage,
        page: pageForQuery,
        search: debouncedSearch || undefined,
        tahun: debouncedTahun || undefined,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
    enabled: options.enabled,
    retry: 1,
    networkMode: 'offlineFirst',
    // Placeholder hanya untuk navigasi halaman dalam filter yang sama — bukan search
    placeholderData:
      options.keepPagePlaceholder === false
        ? undefined
        : (previousData, previousQuery) => {
            const prevKey = previousQuery?.queryKey?.[2] as
              | { search?: string; tahun?: string }
              | undefined
            const sameFilter =
              (prevKey?.search || '') === (debouncedSearch || '') &&
              (prevKey?.tahun || '') === (debouncedTahun || '')
            return sameFilter ? previousData : undefined
          },
    staleTime: 15_000,
    // Jangan cache lama hasil search di disk lewat persist global list
    gcTime: 5 * 60_000,
  })

  const items = query.data?.data ?? []
  const pagination = readPaginationMeta(
    query.data?.meta as Record<string, unknown> | undefined,
    {
      page: pageForQuery,
      perPage,
      total: Number((query.data?.meta as Record<string, unknown> | undefined)?.total ?? 0),
    },
  )

  const perPageSafe = pagination.perPage > 0 ? pagination.perPage : perPage
  const currentPage = Math.max(1, pagination.currentPage || pageForQuery)
  const total = Math.max(0, pagination.total)
  const lastPage = Math.max(
    1,
    pagination.lastPage || (total > 0 ? Math.ceil(total / perPageSafe) : 1),
  )
  const from = total === 0 ? 0 : (currentPage - 1) * perPageSafe + 1
  const to = Math.min(currentPage * perPageSafe, total)
  const showPager = total > perPageSafe || lastPage > 1
  const isPageLoading = query.isFetching && !query.isPending

  return {
    search,
    setSearch,
    tahun,
    setTahun,
    page: pageForQuery,
    setPage,
    debouncedSearch,
    debouncedTahun,
    searchPending,
    filterKey,
    query,
    items,
    perPage: perPageSafe,
    currentPage,
    lastPage,
    total,
    from,
    to,
    showPager,
    isPageLoading,
    clearFilters: () => {
      setSearch('')
      setTahun('')
      setPage(1)
    },
    goToPage: (next: number) => {
      const clamped = Math.max(1, Math.min(lastPage, next))
      setPage(clamped)
    },
  }
}
