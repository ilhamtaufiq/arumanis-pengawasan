import { memo, useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { PekerjaanDetail } from '@pengawas/shared'
import { type DetailTabId } from '@/lib/pekerjaan-helpers'
import { colors } from '@/theme/tokens'
import { DetailTabBar } from '@/components/pekerjaan/DetailTabBar'
import { FotoTab } from '@/components/pekerjaan/FotoTab'
import { OutputTab } from '@/components/pekerjaan/OutputTab'
import { PenerimaTab } from '@/components/pekerjaan/PenerimaTab'
import { ProgressTab } from '@/components/pekerjaan/ProgressTab'
import { RingkasanTab } from '@/components/pekerjaan/RingkasanTab'
import { TiketTab } from '@/components/pekerjaan/TiketTab'
import { NeoSurface } from '@/components/ui'

type DetailTabShellProps = {
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  isOnline: boolean
  contentPadding: number
}

/**
 * Hanya merender tab aktif — tanpa keep-alive display:none.
 * Mount langsung (tanpa defer InteractionManager) agar pindah tab terasa responsif.
 */
export const DetailTabShell = memo(
  function DetailTabShell({
    pekerjaan,
    pekerjaanId,
    tahunAnggaran,
    isOnline,
    contentPadding,
  }: DetailTabShellProps) {
    const [activeTab, setActiveTab] = useState<DetailTabId>('ringkasan')

    const handleTabChange = useCallback((tab: DetailTabId) => {
      setActiveTab(tab)
    }, [])

    return (
      <>
        <DetailTabBar active={activeTab} onChange={handleTabChange} />

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
          removeClippedSubviews
        >
          {!isOnline ? (
            <NeoSurface tone="main" style={{ gap: 4, padding: 12 }}>
              <Text style={{ fontWeight: '800', color: colors.foreground }}>Mode offline</Text>
              <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
                Menampilkan data tersimpan di perangkat. Data akan diperbarui otomatis saat koneksi kembali.
              </Text>
            </NeoSurface>
          ) : null}

          <View key={activeTab} style={{ width: '100%', gap: 16 }}>
            {activeTab === 'ringkasan' ? <RingkasanTab pekerjaan={pekerjaan} /> : null}
            {activeTab === 'output' ? (
              <OutputTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
            ) : null}
            {activeTab === 'penerima' ? (
              <PenerimaTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
            ) : null}
            {activeTab === 'foto' ? <FotoTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} /> : null}
            {activeTab === 'progress' ? (
              <ProgressTab pekerjaanId={pekerjaanId} tahunAnggaran={tahunAnggaran} />
            ) : null}
            {activeTab === 'tiket' ? <TiketTab pekerjaanId={pekerjaanId} /> : null}
          </View>
        </ScrollView>
      </>
    )
  },
  (prev, next) =>
    prev.pekerjaanId === next.pekerjaanId &&
    prev.tahunAnggaran === next.tahunAnggaran &&
    prev.isOnline === next.isOnline &&
    prev.contentPadding === next.contentPadding &&
    prev.pekerjaan === next.pekerjaan,
)
