import { useEffect } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Pekerjaan } from '@pengawas/shared'
import { ApiError } from '@pengawas/api-client'
import { useServerPekerjaanList } from '@/hooks/useServerPekerjaanList'
import { useAuth } from '@/lib/auth'
import { EmptyState, NeoButton, NeoInput, NeoSurface, Spinner } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type PekerjaanPickerModalProps = {
  visible: boolean
  selectedId?: number | null
  onClose: () => void
  onSelect: (item: Pekerjaan) => void
}

/**
 * Picker paket untuk kegiatan lapangan.
 * Search server-side + filter lokal sebagai fallback saat debounce / offline cache.
 */
export function PekerjaanPickerModal({
  visible,
  selectedId,
  onClose,
  onSelect,
}: PekerjaanPickerModalProps) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const { canFetch } = useAuth()
  const list = useServerPekerjaanList({
    enabled: visible && canFetch,
    perPage: 12,
    keepPagePlaceholder: false,
    searchDebounceMs: 300,
    source: 'kegiatan-picker',
  })

  // Reset filter tiap buka modal agar tidak “nyangkut” query lama
  useEffect(() => {
    if (visible) {
      list.clearFilters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat buka
  }, [visible])

  const error = list.query.error instanceof ApiError ? list.query.error : null
  /** Hasil sudah difilter di fetchPekerjaanListWithSearch — tampilkan apa adanya. */
  const displayItems = list.items

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(17,17,17,0.75)',
            justifyContent: 'flex-end',
            paddingTop: insets.top + 8,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Tutup picker" />
          <NeoSurface
            shadow="lg"
            style={{
              maxHeight: height * 0.9,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottomWidth: 0,
              paddingBottom: Math.max(insets.bottom, 12),
              gap: 0,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.foreground, marginBottom: 4 }}>
              Pilih paket pekerjaan
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 10 }}>
              Ketik nama paket / desa / kecamatan. Pencarian di server (seluruh data yang Anda awasi).
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <NeoInput
                  placeholder="Cari paket, desa, kecamatan…"
                  value={list.search}
                  onChangeText={list.setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={() => list.commitSearch()}
                  clearButtonMode="while-editing"
                />
              </View>
              <NeoButton
                label={list.query.isFetching ? '…' : 'Cari'}
                variant="primary"
                compact
                onPress={() => list.commitSearch()}
                disabled={!canFetch || list.query.isFetching}
              />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {(list.searchPending || list.isPageLoading || list.query.isFetching) && (
                <ActivityIndicator size="small" color={colors.foreground} />
              )}
              {list.query.isFetching ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
                  {list.debouncedSearch
                    ? `Memuat katalog & mencari “${list.debouncedSearch}”…`
                    : 'Memuat paket…'}
                </Text>
              ) : null}
              {!list.query.isFetching && list.total > 0 ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
                  {list.from}–{list.to} dari {list.total}
                  {list.debouncedSearch ? ` · “${list.debouncedSearch}”` : ''}
                  {list.usedClientScan ? ' · katalog penuh' : ''}
                </Text>
              ) : null}
              {!list.query.isFetching && list.total === 0 && list.debouncedSearch ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
                  Tidak ketemu “{list.debouncedSearch}” di seluruh katalog
                </Text>
              ) : null}
              {list.query.isError ? (
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>
                  Gagal memuat: {list.query.error instanceof Error ? list.query.error.message : 'error'}
                </Text>
              ) : null}
              {list.search.trim() ? (
                <Pressable onPress={list.clearFilters} hitSlop={8}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>
                    Hapus filter
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {!canFetch ? (
              <EmptyState
                title="Sesi belum siap"
                description="Tunggu autentikasi selesai, lalu buka lagi."
              />
            ) : null}

            {canFetch && list.query.isPending && !list.query.data ? (
              <View style={{ paddingVertical: 24 }}>
                <Spinner label="Memuat paket…" />
              </View>
            ) : null}

            {canFetch && error && !list.query.data ? (
              <EmptyState
                title={error.status === 403 ? 'Akses ditolak' : 'Gagal memuat'}
                description={error.message}
                actionLabel="Coba lagi"
                onAction={() => void list.query.refetch()}
              />
            ) : null}

            {canFetch && (list.query.data || (!list.query.isPending && !error)) ? (
              <FlatList
                data={displayItems}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: height * 0.48 }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                extraData={`${list.filterKey}:${list.page}:${list.search}`}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  !list.query.isPending && !list.searchPending && !list.query.isFetching ? (
                    <EmptyState
                      title="Tidak ada paket"
                      description={
                        list.debouncedSearch
                          ? `Tidak ada hasil untuk “${list.debouncedSearch}”. Coba kata lain.`
                          : 'Belum ada pekerjaan untuk akun ini.'
                      }
                    />
                  ) : list.searchPending || list.query.isFetching ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator color={colors.foreground} />
                      <Text style={{ marginTop: 8, fontWeight: '700', fontSize: 12 }}>Mencari…</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const selected = selectedId === item.id
                  const desa = item.desa?.nama_desa?.trim()
                  const kec = item.kecamatan?.nama_kecamatan?.trim()
                  const loc = [desa, kec].filter(Boolean).join(' · ')
                  return (
                    <Pressable
                      onPress={() => onSelect(item)}
                      style={{
                        borderWidth: 2,
                        borderColor: colors.border,
                        borderRadius: radius,
                        backgroundColor: selected ? colors.main : colors.card,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontWeight: '900', fontSize: 14, color: colors.foreground }}>
                        {item.nama_paket}
                      </Text>
                      {loc ? (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
                          {loc}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>ID #{item.id}</Text>
                    </Pressable>
                  )
                }}
                ListFooterComponent={
                  list.showPager ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 12,
                        justifyContent: 'center',
                      }}
                    >
                      <NeoButton
                        label="Sebelumnya"
                        variant="neutral"
                        compact
                        disabled={list.page <= 1 || list.isPageLoading}
                        onPress={() => list.goToPage(list.page - 1)}
                      />
                      <Text style={{ alignSelf: 'center', fontWeight: '800', fontSize: 12 }}>
                        {list.page}/{list.lastPage}
                      </Text>
                      <NeoButton
                        label="Berikutnya"
                        variant="neutral"
                        compact
                        disabled={list.page >= list.lastPage || list.isPageLoading}
                        onPress={() => list.goToPage(list.page + 1)}
                      />
                    </View>
                  ) : null
                }
              />
            ) : null}

            <View style={{ marginTop: 12 }}>
              <NeoButton label="Tutup" variant="ghost" fullWidth onPress={onClose} />
            </View>
          </NeoSurface>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
