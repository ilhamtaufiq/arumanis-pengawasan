import { useMemo, useState } from 'react'
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

/** Jangan pernah tarik semua paket di dashboard (admin 400+ = lag/OOM). */
const ATTENTION_LIMIT = 12
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
   * Dashboard ringan:
   * 1) total dari meta.paginasi (per_page=1)
   * 2) daftar "perhatian" kecil tanpa summary/foto payload
   * Admin tidak memuat seluruh pekerjaan.
   */
  const dashboardQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({
      scope: elevated ? 'dashboard-light' : 'dashboard-assigned',
      search: debouncedSearch || undefined,
      tahun: debouncedTahun || undefined,
      mode: 'dashboard-v2',
    }),
    queryFn: async () => {
      const filter = {
        search: debouncedSearch || undefined,
        tahun: debouncedTahun || undefined,
        sort_by: 'updated_at' as const,
        sort_direction: 'desc' as const,
      }

      const [countRes, listRes] = await Promise.all([
        getPekerjaanList({
          ...filter,
          per_page: 1,
          page: 1,
        }),
        getPekerjaanList({
          ...filter,
          // Tanpa summary — cukup list ringkas
          per_page: ATTENTION_LIMIT,
          page: 1,
        }),
      ])

      const meta = countRes.meta as Record<string, unknown> | undefined
      const total = Number(meta?.total ?? listRes.data?.length ?? 0)
      const items = listRes.data ?? []

      // Metrik dari sampel halaman (admin: sampel 12 terbaru; pengawas: biasanya semua assign)
      const belumProgress = items.filter((item) => Number(item.progress_estimasi_fisik ?? 0) <= 0).length
      const fotoBelum = items.filter((item) => resolveFotoStatus(item) !== 'selesai').length
      const perhatian = items
        .filter(
          (item) =>
            Number(item.progress_estimasi_fisik ?? 0) <= 0 || resolveFotoStatus(item) !== 'selesai',
        )
        .slice(0, elevated ? 12 : 8)

      return {
        total: Number.isFinite(total) ? total : items.length,
        sampleSize: items.length,
        belumProgress,
        fotoBelum,
        perhatian,
        items,
      }
    },
    enabled: canFetch,
    retry: 1,
    staleTime: 45_000,
  })

  const data = dashboardQuery.data
  const error = dashboardQuery.error instanceof ApiError ? dashboardQuery.error : null

  const metricsHint = useMemo(() => {
    if (!elevated || !data) return null
    if (data.total <= ATTENTION_LIMIT) return null
    return `Metrik "belum progress/foto" dihitung dari ${data.sampleSize} paket terbaru (bukan seluruh ${data.total}). Gunakan tab Pekerjaan untuk cari & paginasi.`
  }, [data, elevated])

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SectionHeader
        title="Dashboard"
        description={pekerjaanScopeDescription(user)}
        action={
          <NeoButton label="Notifikasi" variant="neutral" compact onPress={() => router.push('/notifikasi')} />
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <NeoBadge tone={elevated ? 'info' : 'success'}>{roleLabel}</NeoBadge>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>
          {elevated ? 'Cakupan: seluruh pekerjaan (ringkas)' : 'Cakupan: hanya yang ditugaskan'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <NeoInput
            placeholder="Cari paket / desa (server)"
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
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>Mencari…</Text>
      ) : null}

      {dashboardQuery.isLoading ? <Spinner label="Memuat ringkasan…" /> : null}

      {error ? (
        <EmptyState
          title={error.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat dashboard'}
          description={error.message}
          actionLabel="Coba lagi"
          onAction={() => void dashboardQuery.refetch()}
        />
      ) : null}

      {!dashboardQuery.isLoading && !error && data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard
              label={elevated ? 'Total Pekerjaan' : 'Pekerjaan Ditugaskan'}
              value={formatNumber(data.total)}
              tone="main"
            />
            <MetricCard
              label={elevated ? 'Belum Progress*' : 'Belum Progress'}
              value={formatNumber(data.belumProgress)}
              tone="secondary"
            />
            <MetricCard
              label={elevated ? 'Foto Belum*' : 'Foto Belum Lengkap'}
              value={formatNumber(data.fotoBelum)}
              tone="accent"
            />
          </View>

          {metricsHint ? (
            <NeoSurface tone="main" style={{ padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '800', fontSize: 13 }}>Mode admin (ringan)</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
                {metricsHint}
              </Text>
            </NeoSurface>
          ) : null}

          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>
              {debouncedSearch || debouncedTahun ? 'Hasil pencarian' : 'Perlu Perhatian'}
            </Text>

            {(debouncedSearch || debouncedTahun ? data.items : data.perhatian).map((item) => (
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
                title={debouncedSearch || debouncedTahun ? 'Tidak ada hasil' : 'Tidak ada pekerjaan'}
                description={
                  debouncedSearch || debouncedTahun
                    ? 'Coba kata kunci lain, atau buka tab Pekerjaan.'
                    : elevated
                      ? 'Belum ada data pekerjaan.'
                      : 'Belum ada pekerjaan yang ditugaskan ke akun Anda.'
                }
              />
            ) : !debouncedSearch && !debouncedTahun && data.perhatian.length === 0 ? (
              <EmptyState
                title="Semua aman"
                description="Tidak ada paket yang butuh perhatian segera pada sampel ini."
              />
            ) : null}

            <NeoButton
              label={
                debouncedSearch
                  ? 'Cari di tab Pekerjaan (paginasi)'
                  : 'Lihat semua pekerjaan'
              }
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
