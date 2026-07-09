import { useMemo, type ReactNode } from 'react'
import { View } from 'react-native'
import { useResponsive } from '@/lib/responsive'
import { useLocalSearchParams } from 'expo-router'
import { colors } from '@/theme/tokens'
import { useIsRestoring, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { usePekerjaanRealtime } from '@/hooks/usePekerjaanRealtime'
import { useIsOnline } from '@/hooks/useIsOnline'
import { useAuth } from '@/lib/auth'
import { getPekerjaanDetail } from '@/lib/api'
import { DetailTabShell } from '@/components/pekerjaan/DetailTabShell'
import { PekerjaanDetailHero } from '@/components/pekerjaan/PekerjaanDetailHero'
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary'
import { EmptyState, Spinner } from '@/components/ui'

function resolveRouteId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ''
}

function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, minHeight: 0 }}>
      {children}
    </View>
  )
}

export default function PekerjaanDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const id = resolveRouteId(params.id)
  const pekerjaanId = Number(id)
  const { contentPadding, isTablet, maxContentWidth } = useResponsive()
  const { canFetch, isLoading: authLoading } = useAuth()
  const isRestoring = useIsRestoring()
  const isOnline = useIsOnline()
  usePekerjaanRealtime(pekerjaanId)

  const detailQuery = useQuery({
    queryKey: queryKeys.pekerjaan.detail(pekerjaanId),
    queryFn: () => getPekerjaanDetail(id || ''),
    enabled: canFetch && Boolean(id) && Number.isFinite(pekerjaanId) && !isRestoring,
    retry: false,
    networkMode: 'offlineFirst',
  })

  const tahunAnggaran = useMemo(() => {
    const fromKegiatan = Number(detailQuery.data?.kegiatan?.tahun_anggaran)
    return Number.isFinite(fromKegiatan) && fromKegiatan > 0 ? fromKegiatan : new Date().getFullYear()
  }, [detailQuery.data?.kegiatan?.tahun_anggaran])

  const progressValue = useMemo(() => {
    const item = detailQuery.data
    if (!item) return 0
    return Number(item.progress_estimasi_fisik ?? item.progress_total ?? 0)
  }, [detailQuery.data])

  if (!id || !Number.isFinite(pekerjaanId) || pekerjaanId <= 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <EmptyState title="ID tidak valid" description="Parameter pekerjaan pada URL tidak bisa dibaca." />
        </View>
      </ScreenContainer>
    )
  }

  if (authLoading || isRestoring || (detailQuery.isPending && !detailQuery.data)) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Spinner label="Memuat detail..." />
        </View>
      </ScreenContainer>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <EmptyState
            title="Gagal memuat detail"
            description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Pekerjaan tidak ditemukan'}
            actionLabel="Coba lagi"
            onAction={() => void detailQuery.refetch()}
          />
        </View>
      </ScreenContainer>
    )
  }

  const item = detailQuery.data

  return (
    <ScreenContainer>
      <ScreenErrorBoundary
        scope="Detail pekerjaan"
        extra={{
          pekerjaanId,
          routeId: id,
          namaPaket: item.nama_paket,
        }}
      >
        <View
          style={{
            flex: 1,
            minHeight: 0,
            alignItems: isTablet ? 'center' : 'stretch',
          }}
        >
          <View style={{ width: '100%', maxWidth: maxContentWidth, flex: 1, minHeight: 0 }}>
            <PekerjaanDetailHero pekerjaan={item} progressValue={progressValue} />
            <DetailTabShell
              pekerjaan={item}
              pekerjaanId={pekerjaanId}
              tahunAnggaran={tahunAnggaran}
              isOnline={isOnline}
              contentPadding={contentPadding}
            />
          </View>
        </View>
      </ScreenErrorBoundary>
    </ScreenContainer>
  )
}