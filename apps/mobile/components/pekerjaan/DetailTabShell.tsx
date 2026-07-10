import { memo, useCallback, useEffect, useState } from 'react'
import { InteractionManager, ScrollView, Text, View } from 'react-native'
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
import { NeoSurface, Spinner } from '@/components/ui'

/** Tab dengan pohon UI berat — tunda mount sampai animasi/interaksi tab selesai. */
const HEAVY_TABS = new Set<DetailTabId>(['foto', 'progress'])

type DetailTabShellProps = {
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  isOnline: boolean
  contentPadding: number
}

/**
 * Hanya merender tab aktif.
 *
 * Pola keep-alive (display:none untuk semua tab pernah dibuka) membuat JS + native
 * menahan matriks foto / form progress di pohon, sehingga pindah tab terasa hang.
 */
export const DetailTabShell = memo(function DetailTabShell({
  pekerjaan,
  pekerjaanId,
  tahunAnggaran,
  isOnline,
  contentPadding,
}: DetailTabShellProps) {
  const [activeTab, setActiveTab] = useState<DetailTabId>('ringkasan')
  /** null = konten tab berat belum siap; light tab selalu siap. */
  const [heavyReadyTab, setHeavyReadyTab] = useState<DetailTabId | null>(null)

  const handleTabChange = useCallback((tab: DetailTabId) => {
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    if (!HEAVY_TABS.has(activeTab)) {
      setHeavyReadyTab(null)
      return
    }

    // Reset dulu agar spinner muncul; mount konten setelah interaksi UI (tap tab) selesai.
    setHeavyReadyTab(null)
    let cancelled = false
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        setHeavyReadyTab(activeTab)
      }
    })

    return () => {
      cancelled = true
      task.cancel()
    }
  }, [activeTab])

  const isHeavy = HEAVY_TABS.has(activeTab)
  const showContent = !isHeavy || heavyReadyTab === activeTab

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
        // Hanya satu tab di pohon — clipping aman dan mengurangi node native.
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

        {!showContent ? <Spinner label="Membuka tab..." /> : null}

        {showContent ? (
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
        ) : null}
      </ScrollView>
    </>
  )
})
