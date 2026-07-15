import { useRef } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ApiError } from '@pengawas/api-client'
import { formatCurrency, formatDate, formatPercent } from '@pengawas/shared/format'
import { useAuth } from '@/lib/auth'
import {
  PEKERJAAN_LIST_PER_PAGE,
  useServerPekerjaanList,
} from '@/hooks/useServerPekerjaanList'
import {
  isElevatedUser,
  pekerjaanScopeDescription,
  primaryRoleLabel,
} from '@/lib/roles'
import { EmptyState, NeoBadge, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

/**
 * Tab Pekerjaan — 100% server-side.
 * Admin & pengawas: max 5 baris/halaman. Search memfilter seluruh dataset di API
 * (bukan hanya halaman yang sedang dibuka).
 */
export default function PekerjaanScreen() {
  const listRef = useRef<FlatList>(null)
  const { canFetch, user } = useAuth()
  const elevated = isElevatedUser(user)

  const list = useServerPekerjaanList({
    enabled: canFetch,
    perPage: PEKERJAAN_LIST_PER_PAGE,
    keepPagePlaceholder: true,
  })

  const error = list.query.error instanceof ApiError ? list.query.error : null

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
          <NeoBadge tone="neutral">{`${list.perPage}/halaman · server`}</NeoBadge>
          {list.total > 0 ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
              {list.from}–{list.to} dari {list.total}
            </Text>
          ) : null}
          {list.searchPending || list.isPageLoading ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : null}
          {list.searchPending ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground }}>
              Mencari di server…
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <NeoInput
              placeholder="Cari semua paket (seluruh data, bukan halaman ini)"
              value={list.search}
              onChangeText={list.setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => list.commitSearch()}
              clearButtonMode="while-editing"
            />
          </View>
          <View style={{ width: 88 }}>
            <NeoInput
              placeholder="Tahun"
              value={list.tahun}
              onChangeText={(text) => list.setTahun(text.replace(/[^\d]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={() => list.commitSearch()}
            />
          </View>
        </View>
        {list.search.trim() || list.tahun.trim() ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4 }}>
            <Pressable onPress={() => list.commitSearch()}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>
                {list.query.isFetching ? 'Mencari di seluruh data…' : 'Cari sekarang'}
              </Text>
            </Pressable>
            <Pressable onPress={list.clearFilters}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.mutedForeground }}>
                Hapus filter
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4, lineHeight: 15 }}>
            Search memindai seluruh data (bukan hanya halaman ini).
          </Text>
        )}
      </View>

      {list.query.isPending && !list.query.data ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Spinner label="Memuat pekerjaan…" />
        </View>
      ) : null}

      {error && !list.query.data ? (
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
            onAction={() => void list.query.refetch()}
          />
        </View>
      ) : null}

      {list.query.data || (!list.query.isPending && !error) ? (
        <FlatList
          ref={listRef}
          style={{ flex: 1, minHeight: 120 }}
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          extraData={`${list.filterKey}:${list.page}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !list.query.isPending && !list.searchPending && !error ? (
              <EmptyState
                title={
                  list.debouncedSearch || list.debouncedTahun
                    ? 'Tidak ada hasil di server'
                    : 'Belum ada pekerjaan'
                }
                description={
                  list.debouncedSearch || list.debouncedTahun
                    ? 'Kata kunci tidak cocok dengan paket / desa / kecamatan manapun.'
                    : elevated
                      ? 'Tidak ada data pekerjaan.'
                      : 'Tidak ada pekerjaan yang ditugaskan ke akun Anda.'
                }
              />
            ) : list.searchPending ? (
              <View style={{ padding: 24 }}>
                <Spinner label="Mencari di server…" />
              </View>
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

      {list.showPager ? (
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
            Halaman {list.currentPage} / {list.lastPage}
            {list.total > 0 ? ` · ${list.total} paket · ${list.perPage}/halaman` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              disabled={list.currentPage <= 1 || list.isPageLoading || list.searchPending}
              onPress={() => {
                list.goToPage(list.currentPage - 1)
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              }}
              style={{
                flex: 1,
                opacity: list.currentPage <= 1 || list.isPageLoading || list.searchPending ? 0.45 : 1,
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
              disabled={list.currentPage >= list.lastPage || list.isPageLoading || list.searchPending}
              onPress={() => {
                list.goToPage(list.currentPage + 1)
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              }}
              style={{
                flex: 1,
                opacity:
                  list.currentPage >= list.lastPage || list.isPageLoading || list.searchPending
                    ? 0.45
                    : 1,
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
      ) : list.total > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: colors.mutedForeground,
              fontWeight: '600',
            }}
          >
            {list.total} paket (1 halaman)
          </Text>
        </View>
      ) : null}
    </View>
  )
}
