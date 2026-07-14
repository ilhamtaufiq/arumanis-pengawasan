import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useResponsive } from '@/lib/responsive'
import { colors } from '@/theme/tokens'
import { useIsRestoring, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { usePekerjaanRealtime } from '@/hooks/usePekerjaanRealtime'
import { useIsOnline } from '@/hooks/useIsOnline'
import { useAuth } from '@/lib/auth'
import { getPekerjaanDetail } from '@/lib/api'
import { slimPekerjaanDetailForUi } from '@/lib/pekerjaan-detail-slim'
import { DetailTabShell } from '@/components/pekerjaan/DetailTabShell'
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary'
import { EmptyState, Spinner } from '@/components/ui'
import { ApiError } from '@pengawas/api-client'

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
  const [screenFocused, setScreenFocused] = useState(true)
  // Realtime ditunda agar buka detail tidak bentrok dengan parse payload besar.
  const [realtimeReady, setRealtimeReady] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true)
      setRealtimeReady(false)
      const timer = setTimeout(() => setRealtimeReady(true), 2_000)
      return () => {
        setScreenFocused(false)
        setRealtimeReady(false)
        clearTimeout(timer)
      }
    }, []),
  )

  usePekerjaanRealtime(
    pekerjaanId,
    screenFocused && canFetch && realtimeReady && Number.isFinite(pekerjaanId) && pekerjaanId > 0,
  )

  const detailQuery = useQuery({
    queryKey: queryKeys.pekerjaan.detail(pekerjaanId),
    queryFn: async () => {
      const raw = await getPekerjaanDetail(id || '')
      return slimPekerjaanDetailForUi(raw)
    },
    enabled: canFetch && Boolean(id) && Number.isFinite(pekerjaanId) && pekerjaanId > 0 && !isRestoring,
    retry: 1,
    networkMode: 'offlineFirst',
    staleTime: 90_000,
    gcTime: 1000 * 60 * 20,
    // Jangan double-fetch besar saat mount (sering OOM di Android low-end)
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  const tahunAnggaran = useMemo(() => {
    const fromKegiatan = Number(detailQuery.data?.kegiatan?.tahun_anggaran)
    return Number.isFinite(fromKegiatan) && fromKegiatan > 0 ? fromKegiatan : new Date().getFullYear()
  }, [detailQuery.data?.kegiatan?.tahun_anggaran])

  const progressValue = useMemo(() => {
    const item = detailQuery.data
    if (!item) return 0
    const raw = Number(item.progress_estimasi_fisik ?? item.progress_total ?? 0)
    return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0
  }, [detailQuery.data])

  if (!id || !Number.isFinite(pekerjaanId) || pekerjaanId <= 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <EmptyState
            title="ID tidak valid"
            description="Parameter pekerjaan pada URL tidak bisa dibaca."
          />
        </View>
      </ScreenContainer>
    )
  }

  if (authLoading || isRestoring || (detailQuery.isPending && !detailQuery.data)) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Spinner label="Memuat detail…" />
        </View>
      </ScreenContainer>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <EmptyState
            title={
              apiError?.status === 403
                ? 'Akses ditolak'
                : apiError?.status === 404
                  ? 'Pekerjaan tidak ditemukan'
                  : 'Gagal memuat detail'
            }
            description={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'Pekerjaan tidak ditemukan atau sesi bermasalah.'
            }
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
          fotoCount: item.foto?.length ?? 0,
        }}
      >
        <View
          style={{
            flex: 1,
            minHeight: 0,
            alignItems: isTablet ? 'center' : 'stretch',
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: isTablet ? maxContentWidth : undefined,
              flex: 1,
              minHeight: 0,
            }}
          >
            <DetailTabShell
              pekerjaan={item}
              pekerjaanId={pekerjaanId}
              tahunAnggaran={tahunAnggaran}
              progressValue={progressValue}
              isOnline={isOnline}
              contentPadding={contentPadding}
            />
          </View>
        </View>
      </ScreenErrorBoundary>
    </ScreenContainer>
  )
}
