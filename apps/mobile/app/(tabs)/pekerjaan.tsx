import { useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatCurrency, formatDate, formatPercent } from '@pengawas/shared/format'
import { getPekerjaanList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EmptyState, NeoBadge, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function PekerjaanScreen() {
  const [search, setSearch] = useState('')
  const [tahun, setTahun] = useState('')
  const [page, setPage] = useState(1)
  const { canFetch } = useAuth()

  const pekerjaanQuery = useQuery({
    queryKey: queryKeys.pekerjaan.list({ search, tahun, page }),
    queryFn: () =>
      getPekerjaanList({
        per_page: 20,
        page,
        search: search || undefined,
        tahun: tahun || undefined,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
    enabled: canFetch,
    retry: false,
    networkMode: 'offlineFirst',
  })

  const meta = pekerjaanQuery.data?.meta as Record<string, unknown> | undefined
  const currentPage = Number(meta?.current_page || page)
  const lastPage = Number(meta?.last_page || 1)
  const error = pekerjaanQuery.error instanceof ApiError ? pekerjaanQuery.error : null

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <SectionHeader title="Pekerjaan" description="Daftar paket yang diawasi." />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <NeoInput
            placeholder="Cari paket"
            value={search}
            onChangeText={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
        </View>
        <View style={{ width: 88 }}>
          <NeoInput
            placeholder="Tahun"
            value={tahun}
            onChangeText={(value) => {
              setTahun(value)
              setPage(1)
            }}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {pekerjaanQuery.isPending && !pekerjaanQuery.data ? <Spinner label="Memuat pekerjaan..." /> : null}

      {error && !pekerjaanQuery.data ? (
        <EmptyState
          title={error.status === 401 ? 'Sesi tidak valid' : error.status === 403 ? 'Akses ditolak' : 'Gagal memuat'}
          description={error.message}
          actionLabel="Coba lagi"
          onAction={() => void pekerjaanQuery.refetch()}
        />
      ) : null}

      <FlatList
        data={pekerjaanQuery.data?.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          !pekerjaanQuery.isPending && !error ? (
            <EmptyState title="Belum ada pekerjaan" description="Tidak ada data untuk filter ini." />
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
                {[item.kecamatan?.nama_kecamatan, item.desa?.nama_desa].filter(Boolean).join(' · ') || 'Lokasi belum diisi'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <NeoBadge tone="info">{formatPercent(item.progress_estimasi_fisik)}</NeoBadge>
                <NeoBadge tone="neutral">{formatCurrency(item.pagu)}</NeoBadge>
              </View>
              {item.updated_at ? (
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Diperbarui {formatDate(item.updated_at)}</Text>
              ) : null}
            </NeoSurface>
          </Pressable>
        )}
        ListFooterComponent={
          lastPage > 1 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
              <Pressable
                disabled={currentPage <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  flex: 1,
                  opacity: currentPage <= 1 ? 0.5 : 1,
                  borderWidth: 2,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700' }}>Sebelumnya</Text>
              </Pressable>
              <Text style={{ alignSelf: 'center', fontWeight: '700' }}>
                {currentPage}/{lastPage}
              </Text>
              <Pressable
                disabled={currentPage >= lastPage}
                onPress={() => setPage((p) => Math.min(lastPage, p + 1))}
                style={{
                  flex: 1,
                  opacity: currentPage >= lastPage ? 0.5 : 1,
                  borderWidth: 2,
                  borderColor: colors.border,
                  backgroundColor: colors.main,
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700' }}>Berikutnya</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  )
}