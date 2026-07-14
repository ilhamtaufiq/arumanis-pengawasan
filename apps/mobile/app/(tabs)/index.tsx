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

export default function DashboardScreen() {
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const { canFetch, user } = useAuth()
  const elevated = isElevatedUser(user)
  const roleLabel = primaryRoleLabel(user)

  const pekerjaanQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({ summary: 1, scope: elevated ? 'all' : 'assigned' }),
    // Backend byUserRole: admin = semua; non-admin = user_pekerjaan + kegiatan_role
    queryFn: () => getPekerjaanList({ per_page: -1, summary: 1 }),
    enabled: canFetch,
    retry: false,
    staleTime: 60_000,
  })

  const pekerjaanData = pekerjaanQuery.data?.data ?? []

  const filtered = useMemo(() => {
    return pekerjaanData.filter((item) => {
      const matchesSearch =
        !search ||
        `${item.nama_paket} ${item.kode_rekening || ''}`.toLowerCase().includes(search.toLowerCase())
      const matchesYear = !tahun || `${item.kegiatan?.tahun_anggaran || ''}` === tahun
      return matchesSearch && matchesYear
    })
  }, [pekerjaanData, search, tahun])

  const belumProgress = filtered.filter((item) => Number(item.progress_estimasi_fisik ?? 0) <= 0).length
  const fotoBelum = filtered.filter((item) => resolveFotoStatus(item) !== 'selesai').length
  const perhatian = useMemo(
    () =>
      filtered
        .filter(
          (item) =>
            Number(item.progress_estimasi_fisik ?? 0) <= 0 || resolveFotoStatus(item) !== 'selesai',
        )
        .slice(0, elevated ? 12 : 8),
    [filtered, elevated],
  )

  const error = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null

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
          {elevated
            ? 'Cakupan: seluruh pekerjaan'
            : 'Cakupan: hanya yang ditugaskan'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <NeoInput placeholder="Cari paket" value={search} onChangeText={setSearch} />
        </View>
        <View style={{ width: 88 }}>
          <NeoInput placeholder="Tahun" value={tahun} onChangeText={setTahun} keyboardType="number-pad" />
        </View>
      </View>

      {pekerjaanQuery.isLoading ? <Spinner label="Memuat ringkasan…" /> : null}

      {error ? (
        <EmptyState
          title={error.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat dashboard'}
          description={error.message}
          actionLabel="Coba lagi"
          onAction={() => void pekerjaanQuery.refetch()}
        />
      ) : null}

      {!pekerjaanQuery.isLoading && !error ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard
              label={elevated ? 'Total Pekerjaan' : 'Pekerjaan Ditugaskan'}
              value={formatNumber(filtered.length)}
              tone="main"
            />
            <MetricCard label="Belum Progress" value={formatNumber(belumProgress)} tone="secondary" />
            <MetricCard label="Foto Belum Lengkap" value={formatNumber(fotoBelum)} tone="accent" />
          </View>

          {elevated && filtered.length > 50 ? (
            <NeoSurface tone="main" style={{ padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '800', fontSize: 13 }}>Mode admin</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 17 }}>
                Daftar di bawah menampilkan ringkasan seluruh paket. Gunakan tab Pekerjaan untuk navigasi
                berhalaman.
              </Text>
            </NeoSurface>
          ) : null}

          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>Perlu Perhatian</Text>
            {perhatian.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/pekerjaan/${item.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
              >
                <NeoSurface style={{ gap: 6 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15 }}>{item.nama_paket}</Text>
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

            {filtered.length === 0 ? (
              <EmptyState
                title="Tidak ada pekerjaan"
                description={
                  elevated
                    ? 'Belum ada data pekerjaan untuk filter ini.'
                    : 'Belum ada pekerjaan yang ditugaskan ke akun Anda. Hubungi admin untuk assignment.'
                }
              />
            ) : perhatian.length === 0 ? (
              <EmptyState
                title="Semua aman"
                description="Tidak ada paket yang butuh perhatian segera pada filter ini."
              />
            ) : null}

            <NeoButton
              label="Lihat semua pekerjaan"
              variant="neutral"
              fullWidth
              onPress={() => router.push('/pekerjaan')}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}
