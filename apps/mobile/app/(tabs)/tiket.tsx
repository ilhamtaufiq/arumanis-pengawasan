import { FlatList, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@pengawas/api-client'
import { queryKeys } from '@pengawas/shared/query-keys'
import { formatDate } from '@pengawas/shared/format'
import { getTiketList } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EmptyState, NeoBadge, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

function statusTone(status?: string | null): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  const value = (status || '').toLowerCase()
  if (value.includes('selesai') || value.includes('closed')) return 'success'
  if (value.includes('proses') || value.includes('open')) return 'info'
  if (value.includes('tunggu') || value.includes('pending')) return 'warning'
  if (value.includes('tolak') || value.includes('gagal')) return 'danger'
  return 'neutral'
}

export default function TiketScreen() {
  const { canFetch } = useAuth()

  const tiketQuery = useQuery({
    queryKey: queryKeys.tiket.list({}),
    queryFn: () => getTiketList({ per_page: 30 }),
    enabled: canFetch,
    retry: false,
  })

  const error = tiketQuery.error instanceof ApiError ? tiketQuery.error : null
  const items = tiketQuery.data?.data ?? []

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <SectionHeader title="Tiket" description="Isu lapangan dan permintaan dukungan." />

      {tiketQuery.isLoading ? <Spinner label="Memuat tiket..." /> : null}

      {error ? (
        <EmptyState
          title="Gagal memuat tiket"
          description={error.message}
          actionLabel="Coba lagi"
          onAction={() => void tiketQuery.refetch()}
        />
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          !tiketQuery.isLoading && !error ? (
            <EmptyState title="Belum ada tiket" description="Tiket pekerjaan akan muncul di sini." />
          ) : null
        }
        renderItem={({ item }) => (
          <NeoSurface style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>{item.subjek}</Text>
            <Text style={{ fontSize: 14, color: colors.mutedForeground }} numberOfLines={2}>
              {item.deskripsi || '-'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <NeoBadge tone={statusTone(item.status)}>{item.status || 'Status tidak diketahui'}</NeoBadge>
              {item.prioritas ? <NeoBadge tone="warning">{item.prioritas}</NeoBadge> : null}
            </View>
            {item.created_at ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{formatDate(item.created_at)}</Text>
            ) : null}
          </NeoSurface>
        )}
      />
    </View>
  )
}