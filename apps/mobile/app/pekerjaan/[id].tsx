import { useMemo, useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useResponsive } from '@/lib/responsive'
import { useLocalSearchParams } from 'expo-router'
import { colors } from '@/theme/tokens'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { usePekerjaanRealtime } from '@/hooks/usePekerjaanRealtime'
import { useAuth } from '@/lib/auth'
import { getPekerjaanDetail } from '@/lib/api'
import { type DetailTabId } from '@/lib/pekerjaan-helpers'
import { DetailTabBar } from '@/components/pekerjaan/DetailTabBar'
import { FotoTab } from '@/components/pekerjaan/FotoTab'
import { PenerimaTab } from '@/components/pekerjaan/PenerimaTab'
import { PekerjaanDetailHero } from '@/components/pekerjaan/PekerjaanDetailHero'
import { ProgressTab } from '@/components/pekerjaan/ProgressTab'
import { RingkasanTab } from '@/components/pekerjaan/RingkasanTab'
import { TiketTab } from '@/components/pekerjaan/TiketTab'
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
  const [activeTab, setActiveTab] = useState<DetailTabId>('ringkasan')
  const { contentPadding, isTablet, maxContentWidth } = useResponsive()
  const { canFetch, isLoading: authLoading } = useAuth()
  usePekerjaanRealtime(pekerjaanId)

  const detailQuery = useQuery({
    queryKey: queryKeys.pekerjaan.detail(pekerjaanId),
    queryFn: () => getPekerjaanDetail(id || ''),
    enabled: canFetch && Boolean(id) && Number.isFinite(pekerjaanId),
    retry: false,
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

  if (authLoading || detailQuery.isLoading) {
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
      <View
        style={{
          flex: 1,
          minHeight: 0,
          alignItems: isTablet ? 'center' : 'stretch',
        }}
      >
        <View style={{ width: '100%', maxWidth: maxContentWidth, flex: 1, minHeight: 0 }}>
          <PekerjaanDetailHero pekerjaan={item} progressValue={progressValue} />
          <DetailTabBar active={activeTab} onChange={setActiveTab} />

          <ScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{
              flexGrow: 1,
              padding: contentPadding,
              paddingTop: 8,
              gap: 16,
              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
          >
          {activeTab === 'ringkasan' ? <RingkasanTab pekerjaan={item} /> : null}
          {activeTab === 'progress' ? (
            <ProgressTab pekerjaanId={pekerjaanId} tahunAnggaran={tahunAnggaran} />
          ) : null}
          {activeTab === 'penerima' ? <PenerimaTab pekerjaanId={pekerjaanId} pekerjaan={item} /> : null}
          {activeTab === 'foto' ? <FotoTab pekerjaanId={pekerjaanId} pekerjaan={item} /> : null}
          {activeTab === 'tiket' ? <TiketTab pekerjaanId={pekerjaanId} /> : null}
          </ScrollView>
        </View>
      </View>
    </ScreenContainer>
  )
}