import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useTahunAnggaranAktif } from '@/hooks/useTahunAnggaranAktif'
import { readPaginationMeta } from '@/lib/pagination'
import {
  clearPekerjaanCatalogCache,
  fetchPekerjaanListWithSearch,
  getLastPekerjaanSearchDebug,
} from '@/lib/pekerjaan-search'

export const PEKERJAAN_LIST_PER_PAGE = 5
export const SEARCH_DEBOUNCE_MS = 400

type UseServerPekerjaanListOptions = {
  enabled: boolean
  perPage?: number
  keepPagePlaceholder?: boolean
  searchDebounceMs?: number
  source?: string
  /**
   * Pakai tahun anggaran aktif dari AppSetting (default true).
   * List/search hanya data tahun itu → lebih ringan.
   */
  useTahunAktif?: boolean
}

/**
 * List/search pekerjaan lewat API server + filter tahun anggaran aktif.
 *
 * GET /pekerjaan?tahun={tahun_aktif}&search=&page=&per_page=
 */
export function useServerPekerjaanList(options: UseServerPekerjaanListOptions) {
  const queryClient = useQueryClient()
  const perPage = options.perPage ?? PEKERJAAN_LIST_PER_PAGE
  const debounceMs = options.searchDebounceMs ?? SEARCH_DEBOUNCE_MS
  const source = options.source ?? 'server-list'
  const useTahunAktif = options.useTahunAktif !== false

  const { tahunAktif, isLoading: tahunLoading } = useTahunAnggaranAktif({
    enabled: options.enabled && useTahunAktif,
  })

  const [searchInput, setSearchInput] = useState('')
  const [tahunInput, setTahunInput] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [queryTahun, setQueryTahun] = useState('')
  const [page, setPage] = useState(1)
  const tahunSeeded = useRef(false)

  // Seed filter tahun dari AppSetting sekali saat tersedia
  useEffect(() => {
    if (!useTahunAktif || !tahunAktif || tahunSeeded.current) return
    tahunSeeded.current = true
    setTahunInput(tahunAktif)
    setQueryTahun(tahunAktif)
    setPage(1)
  }, [tahunAktif, useTahunAktif])

  const debouncedSearch = useDebouncedValue(searchInput.trim(), debounceMs)
  const debouncedTahun = useDebouncedValue(tahunInput.trim(), debounceMs)

  const prevDebounced = useRef({ s: debouncedSearch, t: debouncedTahun })
  useEffect(() => {
    const prev = prevDebounced.current
    if (prev.s === debouncedSearch && prev.t === debouncedTahun) return
    prevDebounced.current = { s: debouncedSearch, t: debouncedTahun }
    setQuerySearch(debouncedSearch)
    // Jangan timpa tahun aktif dengan debounce kosong sebelum seed
    if (debouncedTahun || !useTahunAktif || tahunSeeded.current) {
      setQueryTahun(debouncedTahun || (useTahunAktif ? tahunAktif || '' : ''))
    }
    setPage(1)
  }, [debouncedSearch, debouncedTahun, tahunAktif, useTahunAktif])

  // Tahun efektif untuk API: input user, fallback tahun aktif
  const apiTahun =
    queryTahun.trim() ||
    (useTahunAktif ? tahunAktif?.trim() || '' : '')

  const hasFilter = Boolean(querySearch || apiTahun)
  const searchPending =
    searchInput.trim() !== querySearch ||
    (tahunInput.trim() !== queryTahun && tahunInput.trim() !== apiTahun)

  const listReady =
    options.enabled && (!useTahunAktif || Boolean(tahunAktif) || !tahunLoading)

  const listKey = useMemo(
    () => ({
      search: querySearch,
      tahun: apiTahun,
      page,
      per_page: perPage,
      source,
    }),
    [querySearch, apiTahun, page, perPage, source],
  )

  const query = useQuery({
    queryKey: queryKeys.pekerjaan.list(listKey),
    queryFn: async ({ queryKey }) => {
      const f = (queryKey[2] || {}) as {
        search?: string
        tahun?: string
        page?: number
        per_page?: number
      }
      return fetchPekerjaanListWithSearch({
        search: String(f.search || '').trim() || undefined,
        tahun: String(f.tahun || '').trim() || undefined,
        page: Math.max(1, Number(f.page) || 1),
        perPage: Math.max(1, Math.min(100, Number(f.per_page) || perPage)),
        sortBy: 'created_at',
        sortDirection: 'desc',
      })
    },
    enabled: listReady,
    retry: 1,
    networkMode: 'online',
    // Jangan 'always' — cukup refetch jika stale (hemat saat pindah tab)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // Search/tahun masih di-cache singkat agar debounce tidak spam server
    staleTime: hasFilter ? 20_000 : 45_000,
    gcTime: 5 * 60_000,
    placeholderData: undefined,
  })

  const commitSearch = useCallback(() => {
    const s = searchInput.trim()
    const t =
      tahunInput.trim() || (useTahunAktif ? tahunAktif?.trim() || '' : '')
    setQuerySearch(s)
    setQueryTahun(t)
    setTahunInput(t)
    setPage(1)
    prevDebounced.current = { s, t }
  }, [searchInput, tahunInput, tahunAktif, useTahunAktif])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setQuerySearch('')
    // Tetap pakai tahun aktif (jangan load semua 558 baris)
    const t = useTahunAktif ? tahunAktif?.trim() || '' : ''
    setTahunInput(t)
    setQueryTahun(t)
    setPage(1)
    prevDebounced.current = { s: '', t }
  }, [tahunAktif, useTahunAktif])

  const items = query.data?.data ?? []
  const meta = query.data?.meta as Record<string, unknown> | undefined
  const pagination = readPaginationMeta(meta, {
    page,
    perPage,
    total: Number(meta?.total ?? 0),
  })

  const perPageSafe = pagination.perPage > 0 ? pagination.perPage : perPage
  const lastPage = Math.max(1, pagination.lastPage)
  const currentPage = Math.min(Math.max(1, page), lastPage)
  const total = Math.max(0, pagination.total)
  const from = total === 0 ? 0 : (currentPage - 1) * perPageSafe + 1
  const to = Math.min(currentPage * perPageSafe, total)

  useEffect(() => {
    if (page > lastPage) setPage(lastPage)
  }, [page, lastPage])

  const lastDebug = getLastPekerjaanSearchDebug()

  return {
    search: searchInput,
    setSearch: setSearchInput,
    tahun: tahunInput,
    setTahun: setTahunInput,
    page: currentPage,
    setPage,
    debouncedSearch: querySearch,
    debouncedTahun: apiTahun,
    tahunAktif: tahunAktif,
    searchPending: searchPending || (useTahunAktif && tahunLoading),
    filterKey: `${querySearch}|${apiTahun}`,
    query,
    items,
    perPage: perPageSafe,
    currentPage,
    lastPage,
    total,
    from,
    to,
    showPager: lastPage > 1,
    isPageLoading: query.isFetching && !query.isPending,
    usedClientScan: lastDebug?.mode === 'client-catalog' || Boolean(meta?.client_catalog),
    lastDebug,
    commitSearch,
    clearFilters,
    refreshCatalog: () => {
      clearPekerjaanCatalogCache()
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'pekerjaan' && q.queryKey[1] === 'list',
      })
    },
    goToPage: (next: number) => setPage(Math.max(1, Math.min(lastPage, next))),
  }
}
