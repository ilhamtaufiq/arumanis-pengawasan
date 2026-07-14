import { useCallback, useEffect, useRef, useState } from 'react'
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

const PER_PAGE = 20

export default function PekerjaanScreen() {
  const listRef = useRef<FlatList>(null)
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 400)
  const debouncedTahun = useDebouncedValue(tahun, 400)
  const { canFetch, user } = useAuth()
  const elevated = isElevatedUser(user)

  // Reset page when filters settle
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, debouncedTahun])

  const pekerjaanQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({
      search: debouncedSearch,
      tahun: debouncedTahun,
      page,
      per_page: PER_PAGE,
    }),
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
    retry: false,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const items = pekerjaanQuery.data?.data ?? []
  const pagination = readPaginationMeta(pekerjaanQuery.data?.meta as Record<string, unknown> | undefined, {
    page,
    perPage: PER_PAGE,
    total: items.length,
  })
  const currentPage = pagination.currentPage
  const lastPage = pagination.lastPage
  const total = pagination.total
  const from = total === 0 ? 0 : (currentPage - 1) * pagination.perPage + 1
  const to = Math.min(currentPage * pagination.perPage, total)
  const error = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null
  const isPageLoading = pekerjaanQuery.isFetching && !pekerjaanQuery.isPending

  const goToPage = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(lastPage, next))
      setPage(clamped)
      listRef.current?.scrollToOffset({ offset: 0, animated: true })
    },
    [lastPage],
  )

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <SectionHeader
        title="Pekerjaan"
        description={pekerjaanScopeDescription(user)}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <NeoBadge tone={elevated ? 'info' : 'success'}>{primaryRoleLabel(user)}</NeoBadge>
        {total > 0 ? (
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
            {from}–{to} dari {total}
          </Text>
        ) : null}
        {isPageLoading ? <ActivityIndicator size="small" color={colors.foreground} /> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <NeoInput
            placeholder="Cari paket"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={{ width: 88 }}>
          <NeoInput
            placeholder="Tahun"
            value={tahun}
            onChangeText={setTahun}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {pekerjaanQuery.isPending && !pekerjaanQuery.data ? (
        <Spinner label="Memuat pekerjaan…" />
      ) : null}

      {error && !pekerjaanQuery.data ? (
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
      ) : null}

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 12, paddingBottom: 12, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !pekerjaanQuery.isPending && !error ? (
            <EmptyState
              title="Belum ada pekerjaan"
              description={
                elevated
                  ? 'Tidak ada data untuk filter ini.'
                  : 'Tidak ada pekerjaan yang ditugaskan ke akun Anda untuk filter ini.'
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

      {/* Pagination fixed di bawah — tidak perlu scroll ke footer list */}
      {lastPage > 1 || total > PER_PAGE ? (
        <View
          style={{
            borderTopWidth: 2,
            borderTopColor: colors.border,
            paddingTop: 10,
            gap: 8,
            backgroundColor: colors.background,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 13, color: colors.mutedForeground }}>
            Halaman {currentPage} / {lastPage}
            {total > 0 ? ` · total ${total}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              disabled={currentPage <= 1 || isPageLoading}
              onPress={() => goToPage(currentPage - 1)}
              style={{
                flex: 1,
                opacity: currentPage <= 1 || isPageLoading ? 0.45 : 1,
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
              disabled={currentPage >= lastPage || isPageLoading}
              onPress={() => goToPage(currentPage + 1)}
              style={{
                flex: 1,
                opacity: currentPage >= lastPage || isPageLoading ? 0.45 : 1,
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
      ) : null}
    </View>
  )
}
