import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatCurrency, formatDate, formatPercent } from '@pengawas/shared/format'
import { getPekerjaanList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { readPaginationMeta } from '@/lib/pagination'
import {
  isElevatedUser,
  pekerjaanScopeDescription,
  primaryRoleLabel,
} from '@/lib/roles'
import { EmptyState, NeoBadge, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

/** 5 pekerjaan per halaman (server-side). */
const PER_PAGE = 5
const SEARCH_DEBOUNCE_MS = 400

export default function PekerjaanScreen() {
  const listRef = useRef<FlatList>(null)
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedTahun = useDebouncedValue(tahun.trim(), SEARCH_DEBOUNCE_MS)
  const { canFetch, user } = useAuth()
  const elevated = isElevatedUser(user)

  const searchPending = search.trim() !== debouncedSearch || tahun.trim() !== debouncedTahun

  // Reset ke halaman 1 saat filter debounced berubah
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, debouncedTahun])

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      tahun: debouncedTahun || undefined,
      page,
      per_page: PER_PAGE,
    }),
    [debouncedSearch, debouncedTahun, page],
  )

  const pekerjaanQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list(listFilters),
    queryFn: () =>
      getPekerjaanList({
        per_page: PER_PAGE,
        page,
        search: debouncedSearch || undefined,
        tahun: debouncedTahun || undefined,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
    enabled: canFetch,
    retry: 1,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  })

  const items = pekerjaanQuery.data?.data ?? []
  const pagination = readPaginationMeta(
    pekerjaanQuery.data?.meta as Record<string, unknown> | undefined,
    {
      page,
      perPage: PER_PAGE,
      // Jangan pakai items.length sebagai total — itu cuma 1 halaman.
      total: Number(
        (pekerjaanQuery.data?.meta as Record<string, unknown> | undefined)?.total ?? 0,
      ),
    },
  )

  // Paksa perPage UI = PER_PAGE bila meta kosong / salah
  const perPage = pagination.perPage > 0 ? pagination.perPage : PER_PAGE
  const currentPage = Math.max(1, pagination.currentPage || page)
  const total = Math.max(0, pagination.total)
  const lastPage = Math.max(
    1,
    pagination.lastPage || (total > 0 ? Math.ceil(total / perPage) : 1),
  )
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)
  const error = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null
  const isPageLoading = pekerjaanQuery.isFetching && !pekerjaanQuery.isPending
  const showPager = total > perPage || lastPage > 1

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(lastPage, next))
      if (clamped === page) return
      setPage(clamped)
      listRef.current?.scrollToOffset({ offset: 0, animated: true })
    },
    [lastPage, page],
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setTahun('')
    setPage(1)
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <SectionHeader title="Pekerjaan" description={pekerjaanScopeDescription(user)} />

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <NeoBadge tone={elevated ? 'info' : 'success'}>{primaryRoleLabel(user)}</NeoBadge>
          {total > 0 ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
              {from}–{to} dari {total}
            </Text>
          ) : null}
          {searchPending || isPageLoading ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : null}
          {searchPending ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground }}>
              Mencari…
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <NeoInput
              placeholder="Cari paket / desa / kecamatan"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <View style={{ width: 88 }}>
            <NeoInput
              placeholder="Tahun"
              value={tahun}
              onChangeText={(text) => setTahun(text.replace(/[^\d]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        {search.trim() || tahun.trim() ? (
          <Pressable onPress={clearFilters} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>
              Hapus filter
            </Text>
          </Pressable>
        ) : null}
      </View>

      {pekerjaanQuery.isPending && !pekerjaanQuery.data ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Spinner label="Memuat pekerjaan…" />
        </View>
      ) : null}

      {error && !pekerjaanQuery.data ? (
        <View style={{ flex: 1, padding: 16 }}>
          <EmptyState
            title={
              error.status === 401
                ? 'Sesi tidak valid'
                : error.status === 403
                  ? 'Akses ditolak'
                  : 'Gagal memuat'
            }
            description={error.message}
            actionLabel="Coba lagi"
            onAction={() => void pekerjaanQuery.refetch()}
          />
        </View>
      ) : null}

      {pekerjaanQuery.data || (!pekerjaanQuery.isPending && !error) ? (
        <FlatList
          ref={listRef}
          style={{ flex: 1, minHeight: 120 }}
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !pekerjaanQuery.isPending && !error ? (
              <EmptyState
                title={debouncedSearch || debouncedTahun ? 'Tidak ada hasil' : 'Belum ada pekerjaan'}
                description={
                  debouncedSearch || debouncedTahun
                    ? 'Coba kata kunci atau tahun lain.'
                    : elevated
                      ? 'Tidak ada data untuk filter ini.'
                      : 'Tidak ada pekerjaan yang ditugaskan ke akun Anda.'
                }
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/pekerjaan/${item.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <NeoSurface style={{ gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800' }}>{item.nama_paket}</Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  {[item.kecamatan?.nama_kecamatan, item.desa?.nama_desa].filter(Boolean).join(' · ') ||
                    'Lokasi belum diisi'}
                </Text>
                {elevated && item.pengawas?.nama ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>
                    Pengawas: {item.pengawas.nama}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <NeoBadge tone="info">{formatPercent(item.progress_estimasi_fisik)}</NeoBadge>
                  <NeoBadge tone="neutral">{formatCurrency(item.pagu)}</NeoBadge>
                </View>
                {item.updated_at ? (
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    Diperbarui {formatDate(item.updated_at)}
                  </Text>
                ) : null}
              </NeoSurface>
            </Pressable>
          )}
        />
      ) : null}

      {/* Pager tetap di bawah layar — 5 item/halaman */}
      {showPager ? (
        <View
          style={{
            borderTopWidth: 2,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12,
            backgroundColor: colors.background,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 13,
              color: colors.mutedForeground,
              marginBottom: 8,
            }}
          >
            Halaman {currentPage} / {lastPage}
            {total > 0 ? ` · ${total} paket · ${perPage}/halaman` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              disabled={currentPage <= 1 || isPageLoading || searchPending}
              onPress={() => goToPage(currentPage - 1)}
              style={{
                flex: 1,
                opacity: currentPage <= 1 || isPageLoading || searchPending ? 0.45 : 1,
                borderWidth: 2,
                borderColor: colors.border,
                backgroundColor: colors.card,
                padding: 12,
                borderRadius: radius,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '800' }}>Sebelumnya</Text>
            </Pressable>
            <Pressable
              disabled={currentPage >= lastPage || isPageLoading || searchPending}
              onPress={() => goToPage(currentPage + 1)}
              style={{
                flex: 1,
                opacity: currentPage >= lastPage || isPageLoading || searchPending ? 0.45 : 1,
                borderWidth: 2,
                borderColor: colors.border,
                backgroundColor: colors.main,
                padding: 12,
                borderRadius: radius,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '800' }}>Berikutnya</Text>
            </Pressable>
          </View>
        </View>
      ) : total > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
          <Text style={{ textAlign: 'center', fontSize: 12, color: colors.mutedForeground, fontWeight: '600' }}>
            {total} paket (semua di 1 halaman)
          </Text>
        </View>
      ) : null}
    </View>
  )
}
