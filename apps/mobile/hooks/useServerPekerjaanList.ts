import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { readPaginationMeta } from '@/lib/pagination'
import { resolveListPageForFilter } from '@/lib/pekerjaan-list-params'
import {
  clearPekerjaanCatalogCache,
  fetchPekerjaanListWithSearch,
} from '@/lib/pekerjaan-search'

export const PEKERJAAN_LIST_PER_PAGE = 5
export const SEARCH_DEBOUNCE_MS = 400

type UseServerPekerjaanListOptions = {
  enabled: boolean
  perPage?: number
  keepPagePlaceholder?: boolean
  searchDebounceMs?: number
  source?: string
}

type ListKeyFilters = {
  search: string
  tahun: string
  page: number
  per_page: number
  source: string
}

/**
 * List pekerjaan.
 * Search: filter di SELURUH katalog (cache memory), bukan halaman aktif.
 */
export function useServerPekerjaanList(options: UseServerPekerjaanListOptions) {
  const queryClient = useQueryClient()
  const perPage = options.perPage ?? PEKERJAAN_LIST_PER_PAGE
  const debounceMs = options.searchDebounceMs ?? SEARCH_DEBOUNCE_MS
  const source = options.source ?? 'server-list'

  const [searchInput, setSearchInput] = useState('')
  const [tahunInput, setTahunInput] = useState('')
  const [page, setPage] = useState(1)
  /** Query yang benar-benar dijalankan (setelah debounce atau commit). */
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedTahun, setAppliedTahun] = useState('')

  const debouncedSearch = useDebouncedValue(searchInput.trim(), debounceMs)
  const debouncedTahun = useDebouncedValue(tahunInput.trim(), debounceMs)

  // Auto-apply debounce → applied
  const lastAutoRef = useRef(`${debouncedSearch}|${debouncedTahun}`)
  const autoKey = `${debouncedSearch}|${debouncedTahun}`
  if (autoKey !== lastAutoRef.current) {
    lastAutoRef.current = autoKey
    if (appliedSearch !== debouncedSearch) setAppliedSearch(debouncedSearch)
    if (appliedTahun !== debouncedTahun) setAppliedTahun(debouncedTahun)
  }

  const filterKey = `${appliedSearch}|${appliedTahun}`
  const prevFilterKeyRef = useRef(filterKey)
  const { pageForQuery, filterChanged } = resolveListPageForFilter({
    page,
    filterKey,
    prevFilterKey: prevFilterKeyRef.current,
  })
  if (filterChanged) {
    prevFilterKeyRef.current = filterKey
    if (page !== 1) setPage(1)
  }

  const searchPending =
    searchInput.trim() !== appliedSearch || tahunInput.trim() !== appliedTahun

  const listFilters = useMemo<ListKeyFilters>(
    () => ({
      search: appliedSearch,
      tahun: appliedTahun,
      page: pageForQuery,
      per_page: perPage,
      source,
    }),
    [appliedSearch, appliedTahun, pageForQuery, perPage, source],
  )

  const query = useQuery({
    queryKey: queryKeys.pekerjaan.list(listFilters),
    queryFn: async ({ queryKey }) => {
      const filters = (queryKey[2] || {}) as ListKeyFilters
      return fetchPekerjaanListWithSearch({
        search: (filters.search || '').trim() || undefined,
        tahun: (filters.tahun || '').trim() || undefined,
        page: Math.max(1, Number(filters.page) || 1),
        perPage: Math.max(1, Number(filters.per_page) || perPage),
        sortBy: 'created_at',
        sortDirection: 'desc',
      })
    },
    enabled: options.enabled,
    retry: 1,
    networkMode: 'online',
    refetchOnMount: 'always',
    staleTime: appliedSearch || appliedTahun ? 0 : 15_000,
    gcTime: 5 * 60_000,
    placeholderData:
      options.keepPagePlaceholder === false
        ? undefined
        : (previousData, previousQuery) => {
            const prevKey = previousQuery?.queryKey?.[2] as ListKeyFilters | undefined
            const sameFilter =
              (prevKey?.search || '') === appliedSearch &&
              (prevKey?.tahun || '') === appliedTahun
            return sameFilter ? previousData : undefined
          },
  })

  const commitSearch = useCallback(() => {
    const s = searchInput.trim()
    const t = tahunInput.trim()
    setAppliedSearch(s)
    setAppliedTahun(t)
    setPage(1)
    // Invalidate semua list di source ini agar fetch ulang
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey
        return key[0] === 'pekerjaan' && key[1] === 'list'
      },
    })
  }, [queryClient, searchInput, tahunInput])

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
  const usedClientScan = Boolean(
    (query.data?.meta as Record<string, unknown> | undefined)?.client_catalog ||
      (query.data?.meta as Record<string, unknown> | undefined)?.client_scan,
  )

  return {
    search: searchInput,
    setSearch: setSearchInput,
    tahun: tahunInput,
    setTahun: setTahunInput,
    page: pageForQuery,
    setPage,
    debouncedSearch: appliedSearch,
    debouncedTahun: appliedTahun,
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
    usedClientScan,
    commitSearch,
    clearFilters: () => {
      setSearchInput('')
      setTahunInput('')
      setAppliedSearch('')
      setAppliedTahun('')
      setPage(1)
    },
    refreshCatalog: () => {
      clearPekerjaanCatalogCache()
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'pekerjaan' && q.queryKey[1] === 'list',
      })
    },
    goToPage: (next: number) => {
      setPage(Math.max(1, Math.min(lastPage, next)))
    },
  }
}
