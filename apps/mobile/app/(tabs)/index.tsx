import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable } from 'react-native'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatNumber, formatPercent } from '@pengawas/shared/format'
import { resolveFotoStatus } from '@pengawas/shared/foto-status'
import { getPekerjaanList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EmptyState, MetricCard, NeoBadge, NeoButton, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function DashboardScreen() {
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const { canFetch } = useAuth()

  const pekerjaanQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({ summary: 1 }),
    queryFn: () => getPekerjaanList({ per_page: -1, summary: 1 }),
    enabled: canFetch,
    retry: false,
  })

  const pekerjaanData = pekerjaanQuery.data?.data ?? []

  const filtered = useMemo(() => {
    return pekerjaanData.filter((item) => {
      const matchesSearch =
        !search || `${item.nama_paket} ${item.kode_rekening || ''}`.toLowerCase().includes(search.toLowerCase())
      const matchesYear = !tahun || `${item.kegiatan?.tahun_anggaran || ''}` === tahun
      return matchesSearch && matchesYear
    })
  }, [pekerjaanData, search, tahun])

  const belumProgress = filtered.filter((item) => Number(item.progress_estimasi_fisik ?? 0) <= 0).length
  const fotoBelum = filtered.filter((item) => resolveFotoStatus(item) !== 'selesai').length

  const error = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SectionHeader
        title="Dashboard"
        description="Ringkasan pekerjaan yang sedang diawasi."
        action={<NeoButton label="Notifikasi" variant="neutral" compact onPress={() => router.push('/notifikasi')} />}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <NeoInput placeholder="Cari paket" value={search} onChangeText={setSearch} />
        </View>
        <View style={{ width: 88 }}>
          <NeoInput placeholder="Tahun" value={tahun} onChangeText={setTahun} keyboardType="number-pad" />
        </View>
      </View>

      {pekerjaanQuery.isLoading ? <Spinner label="Memuat KPI..." /> : null}

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
            <MetricCard label="Total Pekerjaan" value={formatNumber(filtered.length)} tone="main" />
            <MetricCard label="Belum Progress" value={formatNumber(belumProgress)} tone="secondary" />
            <MetricCard label="Foto Belum Lengkap" value={formatNumber(fotoBelum)} tone="accent" />
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>Perlu Perhatian</Text>
            {filtered
              .filter((item) => Number(item.progress_estimasi_fisik ?? 0) <= 0 || resolveFotoStatus(item) !== 'selesai')
              .slice(0, 8)
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/pekerjaan/${item.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                >
                  <NeoSurface style={{ gap: 6 }}>
                    <Text style={{ fontWeight: '800', fontSize: 15 }}>{item.nama_paket}</Text>
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
              <EmptyState title="Tidak ada pekerjaan" description="Sesuaikan filter atau periksa assignment akun." />
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}