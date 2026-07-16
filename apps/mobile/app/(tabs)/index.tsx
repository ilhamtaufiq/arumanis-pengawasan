import { Pressable, ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatNumber, formatPercent } from '@pengawas/shared/format'
import { formatPekerjaanLokasi } from '@pengawas/shared/wilayah-fields'
import { resolveFotoStatus } from '@pengawas/shared/foto-status'
import { useAuth } from '@/lib/auth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useTahunAnggaranAktif } from '@/hooks/useTahunAnggaranAktif'
import { fetchPekerjaanListWithSearch } from '@/lib/pekerjaan-search'
import {
  isElevatedUser,
  pekerjaanScopeDescription,
  primaryRoleLabel,
} from '@/lib/roles'
import {
  EmptyState,
  MetricCard,
  NeoBadge,
  NeoButton,
  NeoInput,
  NeoSurface,
  SectionHeader,
  Spinner,
} from '@/components/ui'
import { colors } from '@/theme/tokens'
import { useEffect, useState } from 'react'

/** Dashboard: satu request kecil. Total & search = meta server. */
const DASHBOARD_PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 400

export default function DashboardScreen() {
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedTahun = useDebouncedValue(tahun.trim(), SEARCH_DEBOUNCE_MS)
  const { canFetch, user } = useAuth()
  const { tahunAktif, isLoading: tahunLoading } = useTahunAnggaranAktif({
    enabled: canFetch,
  })
  const elevated = isElevatedUser(user)
  const roleLabel = primaryRoleLabel(user)

  // Seed input tahun dari pengaturan aktif (sekali)
  useEffect(() => {
    if (tahunAktif && !tahun) setTahun(tahunAktif)
  }, [tahunAktif, tahun])

  // Default ke tahun anggaran aktif (pengaturan www/bun)
  const effectiveTahun = (debouncedTahun || tahunAktif || '').trim()
  const searchPending =
    search.trim() !== debouncedSearch ||
    (tahun.trim() !== debouncedTahun && tahun.trim() !== effectiveTahun) ||
    (canFetch && tahunLoading)

  /**
   * Admin TIDAK load semua pekerjaan.
   * - page selalu 1, per_page kecil
   * - tahun = tahun anggaran aktif (default) agar dataset ringan
   * - search/tahun dikirim ke API (filter seluruh DB lalu paginate)
   */
  const dashboardQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({
      mode: 'dashboard-server',
      search: debouncedSearch,
      tahun: effectiveTahun,
      page: 1,
      per_page: DASHBOARD_PAGE_SIZE,
    }),
    queryFn: async ({ queryKey }) => {
      const filters = (queryKey[2] || {}) as {
        search?: string
        tahun?: string
        per_page?: number
      }
      const res = await fetchPekerjaanListWithSearch({
        search: (filters.search || '').trim() || undefined,
        tahun: (filters.tahun || '').trim() || undefined,
        page: 1,
        perPage: Number(filters.per_page) || DASHBOARD_PAGE_SIZE,
        sortBy: 'updated_at',
        sortDirection: 'desc',
      })
      const items = res.data ?? []
      const meta = res.meta as Record<string, unknown> | undefined
      const total = Number(meta?.total ?? items.length)

      return {
        total: Number.isFinite(total) ? total : items.length,
        items,
        belumProgress: items.filter((item) => Number(item.progress_estimasi_fisik ?? 0) <= 0).length,
        fotoBelum: items.filter((item) => resolveFotoStatus(item) !== 'selesai').length,
      }
    },
    enabled: canFetch && (!!effectiveTahun || !tahunLoading),
    retry: 1,
    networkMode: 'online',
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // Tahun aktif hampir selalu ada — jangan staleTime 0 (spam refetch tiap masuk tab)
    staleTime: debouncedSearch ? 15_000 : 45_000,
    gcTime: 5 * 60_000,
  })

  const data = dashboardQuery.data
  const error = dashboardQuery.error instanceof ApiError ? dashboardQuery.error : null
  const hasFilter = Boolean(debouncedSearch || effectiveTahun)

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SectionHeader
        title="Dashboard"
        description={pekerjaanScopeDescription(user)}
        action={
          <NeoButton
            label="Notifikasi"
            variant="neutral"
            compact
            onPress={() => router.push('/notifikasi')}
          />
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <NeoBadge tone={elevated ? 'info' : 'success'}>{roleLabel}</NeoBadge>
        {tahunAktif ? (
          <NeoBadge tone="info">TA {tahunAktif}</NeoBadge>
        ) : null}
        <NeoBadge tone="neutral">server · max {DASHBOARD_PAGE_SIZE}</NeoBadge>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {elevated
            ? 'Admin: filter tahun aktif + paginasi server'
            : 'Pekerjaan ditugaskan · tahun aktif'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <NeoInput
            placeholder="Cari di server (semua halaman)"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <View style={{ width: 88 }}>
          <NeoInput
            placeholder="Tahun"
            value={tahun}
            onChangeText={(t) => setTahun(t.replace(/[^\d]/g, '').slice(0, 4))}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {searchPending ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          Mencari di server…
        </Text>
      ) : null}

      {dashboardQuery.isLoading || searchPending ? (
        <Spinner label={searchPending ? 'Mencari…' : 'Memuat ringkasan…'} />
      ) : null}

      {error ? (
        <EmptyState
          title={error.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat dashboard'}
          description={error.message}
          actionLabel="Coba lagi"
          onAction={() => void dashboardQuery.refetch()}
        />
      ) : null}

      {!dashboardQuery.isLoading && !searchPending && !error && data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard
              label={hasFilter ? 'Hasil di server' : elevated ? 'Total Pekerjaan' : 'Ditugaskan'}
              value={formatNumber(data.total)}
              tone="main"
            />
            <MetricCard
              label="Belum progress (sampel)"
              value={formatNumber(data.belumProgress)}
              tone="secondary"
            />
            <MetricCard
              label="Foto belum (sampel)"
              value={formatNumber(data.fotoBelum)}
              tone="accent"
            />
          </View>

          {elevated ? (
            <NeoSurface tone="main" style={{ padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '800', fontSize: 13 }}>Mode admin ringan</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
                Hanya {DASHBOARD_PAGE_SIZE} baris per request. Search memfilter seluruh database di
                server, lalu menampilkan halaman 1 hasil. Untuk daftar lengkap berhalaman, buka tab
                Pekerjaan.
              </Text>
            </NeoSurface>
          ) : null}

          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>
              {hasFilter ? `Hasil pencarian (${data.total} cocok)` : 'Terbaru / perlu cek'}
            </Text>

            {data.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/pekerjaan/${item.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
              >
                <NeoSurface style={{ gap: 6 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15 }}>{item.nama_paket}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {formatPekerjaanLokasi(item, { empty: 'Lokasi belum diisi' })}
                  </Text>
                  {elevated && item.pengawas?.nama ? (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      Pengawas: {item.pengawas.nama}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <NeoBadge tone="info">{`${formatPercent(item.progress_estimasi_fisik)} fisik`}</NeoBadge>
                    <NeoBadge tone={resolveFotoStatus(item) === 'selesai' ? 'success' : 'warning'}>
                      {resolveFotoStatus(item) === 'selesai' ? 'Foto lengkap' : 'Foto belum lengkap'}
                    </NeoBadge>
                  </View>
                </NeoSurface>
              </Pressable>
            ))}

            {data.total === 0 ? (
              <EmptyState
                title={hasFilter ? 'Tidak ada hasil di server' : 'Tidak ada pekerjaan'}
                description={
                  hasFilter
                    ? 'Kata kunci tidak cocok. Coba di tab Pekerjaan atau ubah kata kunci.'
                    : elevated
                      ? 'Belum ada data pekerjaan.'
                      : 'Belum ada pekerjaan yang ditugaskan ke akun Anda.'
                }
              />
            ) : null}

            <NeoButton
              label={hasFilter ? 'Buka hasil lengkap di tab Pekerjaan' : 'Lihat semua (paginasi)'}
              variant="neutral"
              fullWidth
              onPress={() => router.push('/(tabs)/pekerjaan')}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}
