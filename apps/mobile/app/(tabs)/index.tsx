import { Pressable, ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatNumber, formatPercent } from '@pengawas/shared/format'
import { resolveFotoStatus } from '@pengawas/shared/foto-status'
import { getPekerjaanList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
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
import { useState } from 'react'

/** Dashboard: satu request kecil. Total & search = meta server. */
const DASHBOARD_PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 400

export default function DashboardScreen() {
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedTahun = useDebouncedValue(tahun.trim(), SEARCH_DEBOUNCE_MS)
  const { canFetch, user } = useAuth()
  const elevated = isElevatedUser(user)
  const roleLabel = primaryRoleLabel(user)
  const searchPending =
    search.trim() !== debouncedSearch || tahun.trim() !== debouncedTahun

  /**
   * Admin TIDAK load semua pekerjaan.
   * - page selalu 1, per_page kecil
   * - search/tahun dikirim ke API (filter seluruh DB lalu paginate)
   * - total dari meta.total (hasil filter server), bukan length array lokal
   */
  const dashboardQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({
      mode: 'dashboard-server',
      search: debouncedSearch || undefined,
      tahun: debouncedTahun || undefined,
      page: 1,
      per_page: DASHBOARD_PAGE_SIZE,
    }),
    queryFn: async () => {
      const res = await getPekerjaanList({
        search: debouncedSearch || undefined,
        tahun: debouncedTahun || undefined,
        page: 1,
        per_page: DASHBOARD_PAGE_SIZE,
        sort_by: 'updated_at',
        sort_direction: 'desc',
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
    enabled: canFetch,
    retry: 1,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  const data = dashboardQuery.data
  const error = dashboardQuery.error instanceof ApiError ? dashboardQuery.error : null
  const hasFilter = Boolean(debouncedSearch || debouncedTahun)

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
        <NeoBadge tone="neutral">server · max {DASHBOARD_PAGE_SIZE}</NeoBadge>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {elevated
            ? 'Admin: paginasi server, tidak load semua paket'
            : 'Hanya pekerjaan yang ditugaskan'}
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
                    {[item.kecamatan?.nama_kecamatan, item.desa?.nama_desa].filter(Boolean).join(' · ') ||
                      'Lokasi belum diisi'}
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
