import { memo, useCallback, useState, type ComponentType, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { PekerjaanDetail } from '@pengawas/shared'
import { type DetailTabId } from '@/lib/pekerjaan-helpers'
import { colors } from '@/theme/tokens'
import { DetailTabBar } from '@/components/pekerjaan/DetailTabBar'
import { RingkasanTab } from '@/components/pekerjaan/RingkasanTab'
import { PekerjaanDetailHero } from '@/components/pekerjaan/PekerjaanDetailHero'
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary'
import { NeoSurface } from '@/components/ui'

type DetailTabShellProps = {
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  progressValue: number
  isOnline: boolean
  contentPadding: number
}

type LazyTabModule = {
  default?: ComponentType<Record<string, unknown>>
  FotoTab?: ComponentType<Record<string, unknown>>
  OutputTab?: ComponentType<Record<string, unknown>>
  PenerimaTab?: ComponentType<Record<string, unknown>>
  ProgressTab?: ComponentType<Record<string, unknown>>
  TiketTab?: ComponentType<Record<string, unknown>>
}

/**
 * Lazy require tab berat — cegah force close saat buka detail
 * (ImagePicker / view-shot / progress tidak di-load di first paint).
 */
const tabLoadCache = new Map<DetailTabId, ComponentType<Record<string, unknown>> | null>()
const tabLoadError = new Map<DetailTabId, string>()

function loadTab(tab: DetailTabId): ComponentType<Record<string, unknown>> | null {
  if (tabLoadCache.has(tab)) return tabLoadCache.get(tab) ?? null

  try {
    let Comp: ComponentType<Record<string, unknown>> | null = null
    if (tab === 'foto') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./FotoTab') as LazyTabModule
      Comp = mod.FotoTab ?? mod.default ?? null
    } else if (tab === 'output') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./OutputTab') as LazyTabModule
      Comp = mod.OutputTab ?? mod.default ?? null
    } else if (tab === 'penerima') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./PenerimaTab') as LazyTabModule
      Comp = mod.PenerimaTab ?? mod.default ?? null
    } else if (tab === 'progress') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./ProgressTab') as LazyTabModule
      Comp = mod.ProgressTab ?? mod.default ?? null
    } else if (tab === 'tiket') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./TiketTab') as LazyTabModule
      Comp = mod.TiketTab ?? mod.default ?? null
    }
    tabLoadCache.set(tab, Comp)
    if (!Comp) tabLoadError.set(tab, 'Export komponen tidak ditemukan')
    return Comp
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[DetailTabShell] gagal load tab', tab, error)
    tabLoadError.set(tab, message)
    tabLoadCache.set(tab, null)
    return null
  }
}

function CompactHero({
  namaPaket,
  contentPadding,
  onExpand,
}: {
  namaPaket: string
  contentPadding: number
  onExpand: () => void
}) {
  return (
    <Pressable
      onPress={onExpand}
      accessibilityRole="button"
      accessibilityLabel="Tampilkan ringkasan paket"
      style={{
        marginHorizontal: contentPadding,
        marginTop: contentPadding,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 6,
        backgroundColor: colors.card,
      }}
    >
      <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 14, color: colors.foreground }}>
        {namaPaket || 'Paket pekerjaan'}
      </Text>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
        Ketuk untuk ringkasan paket
      </Text>
    </Pressable>
  )
}

function OfflineBanner() {
  return (
    <NeoSurface tone="main" style={{ gap: 4, padding: 12, marginBottom: 8 }}>
      <Text style={{ fontWeight: '800', color: colors.foreground }}>Mode offline</Text>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
        Menampilkan data tersimpan di perangkat. Data akan diperbarui otomatis saat koneksi kembali.
      </Text>
    </NeoSurface>
  )
}

function LazyTabBody({
  tab,
  pekerjaan,
  pekerjaanId,
  tahunAnggaran,
}: {
  tab: DetailTabId
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
}) {
  if (tab === 'ringkasan') {
    return <RingkasanTab pekerjaan={pekerjaan} />
  }

  const Comp = loadTab(tab)
  if (!Comp) {
    const detail = tabLoadError.get(tab)
    return (
      <NeoSurface style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: '800', fontSize: 15 }}>Gagal memuat tab {tab}</Text>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
          {detail ||
            'Modul tab gagal di-load. Coba buka ulang aplikasi. Jika berulang, perbarui APK (bukan hanya OTA).'}
        </Text>
      </NeoSurface>
    )
  }

  let body: ReactNode = null
  if (tab === 'foto') {
    body = <Comp pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
  } else if (tab === 'output') {
    body = <Comp pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
  } else if (tab === 'penerima') {
    body = <Comp pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
  } else if (tab === 'progress') {
    body = <Comp pekerjaanId={pekerjaanId} tahunAnggaran={tahunAnggaran} />
  } else if (tab === 'tiket') {
    body = <Comp pekerjaanId={pekerjaanId} />
  }

  if (!body) return null

  return (
    <ScreenErrorBoundary
      scope={`Tab ${tab}`}
      extra={{ pekerjaanId, tab }}
      showHomeAction={false}
    >
      <View style={{ flex: 1, minHeight: 0 }}>{body}</View>
    </ScreenErrorBoundary>
  )
}

export const DetailTabShell = memo(function DetailTabShell({
  pekerjaan,
  pekerjaanId,
  tahunAnggaran,
  progressValue,
  isOnline,
  contentPadding,
}: DetailTabShellProps) {
  const [activeTab, setActiveTab] = useState<DetailTabId>('ringkasan')

  const handleTabChange = useCallback((tab: DetailTabId) => {
    setActiveTab(tab)
  }, [])

  const showFullHero = activeTab === 'ringkasan'
  const isFoto = activeTab === 'foto'
  const isProgress = activeTab === 'progress'
  const isHeavy = isFoto || isProgress

  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}>
      {showFullHero ? (
        <PekerjaanDetailHero pekerjaan={pekerjaan} progressValue={progressValue} />
      ) : (
        <CompactHero
          namaPaket={pekerjaan?.nama_paket ?? 'Paket pekerjaan'}
          contentPadding={contentPadding}
          onExpand={() => handleTabChange('ringkasan')}
        />
      )}

      <DetailTabBar active={activeTab} onChange={handleTabChange} contentPadding={contentPadding} />

      {isHeavy ? (
        <View style={{ flex: 1, minHeight: 0, paddingHorizontal: contentPadding, paddingTop: 8 }}>
          {!isOnline ? <OfflineBanner /> : null}
          <LazyTabBody
            tab={activeTab}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
          />
        </View>
      ) : (
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
          {!isOnline ? <OfflineBanner /> : null}
          <LazyTabBody
            tab={activeTab}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
          />
        </ScrollView>
      )}
    </View>
  )
})
