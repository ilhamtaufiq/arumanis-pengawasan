import { memo, useCallback, useEffect, useState, useTransition, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
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
import { PekerjaanDetailHero } from '@/components/pekerjaan/PekerjaanDetailHero'
import { NeoSurface } from '@/components/ui'

/** Tab ringan — boleh keep-alive setelah pernah dibuka. */
const LIGHT_TABS = new Set<DetailTabId>(['ringkasan', 'output', 'penerima', 'tiket'])

type DetailTabShellProps = {
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  progressValue: number
  isOnline: boolean
  contentPadding: number
}

type LightSlotProps = {
  tabId: DetailTabId
  contentTab: DetailTabId
  mounted: boolean
  children: ReactNode
}

/**
 * Keep-alive murah: native view collapsable=false + display none.
 * Hanya untuk tab ringan (tanpa Image grid / form progress besar).
 */
const LightTabSlot = memo(function LightTabSlot({ tabId, contentTab, mounted, children }: LightSlotProps) {
  if (!mounted) return null
  const visible = contentTab === tabId
  return (
    <View
      collapsable={false}
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        display: visible ? 'flex' : 'none',
        width: '100%',
        gap: 16,
      }}
    >
      {children}
    </View>
  )
})

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
        {namaPaket}
      </Text>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
        Ketuk untuk ringkasan paket
      </Text>
    </Pressable>
  )
}

/**
 * Arsitektur anti-lag:
 * 1. selectedTab update sinkron → highlight tab bar instan
 * 2. contentTab lewat startTransition → konten tidak memblok UI
 * 3. Tab ringan keep-alive; tab berat (foto/progress) unmount saat tidak aktif
 * 4. Hero penuh hanya di ringkasan (hemat layout di tab lain)
 */
export const DetailTabShell = memo(
  function DetailTabShell({
    pekerjaan,
    pekerjaanId,
    tahunAnggaran,
    progressValue,
    isOnline,
    contentPadding,
  }: DetailTabShellProps) {
    const [selectedTab, setSelectedTab] = useState<DetailTabId>('ringkasan')
    const [contentTab, setContentTab] = useState<DetailTabId>('ringkasan')
    const [mountedLight, setMountedLight] = useState<Set<DetailTabId>>(() => new Set(['ringkasan']))
    const [, startTransition] = useTransition()

    const handleTabChange = useCallback((tab: DetailTabId) => {
      // Highlight bar dulu — tidak menunggu mount konten berat.
      setSelectedTab(tab)
      startTransition(() => {
        setContentTab(tab)
        if (LIGHT_TABS.has(tab)) {
          setMountedLight((prev) => {
            if (prev.has(tab)) return prev
            const next = new Set(prev)
            next.add(tab)
            return next
          })
        }
      })
    }, [])

    // Pastikan light tab masuk set mounted.
    useEffect(() => {
      if (!LIGHT_TABS.has(contentTab)) return
      setMountedLight((prev) => {
        if (prev.has(contentTab)) return prev
        const next = new Set(prev)
        next.add(contentTab)
        return next
      })
    }, [contentTab])

    const showFullHero = selectedTab === 'ringkasan'

    return (
      <View style={{ flex: 1, minHeight: 0 }}>
        {showFullHero ? (
          <PekerjaanDetailHero pekerjaan={pekerjaan} progressValue={progressValue} />
        ) : (
          <CompactHero
            namaPaket={pekerjaan.nama_paket}
            contentPadding={contentPadding}
            onExpand={() => handleTabChange('ringkasan')}
          />
        )}

        <DetailTabBar active={selectedTab} onChange={handleTabChange} contentPadding={contentPadding} />

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

          <LightTabSlot tabId="ringkasan" contentTab={contentTab} mounted={mountedLight.has('ringkasan')}>
            <RingkasanTab pekerjaan={pekerjaan} />
          </LightTabSlot>

          <LightTabSlot tabId="output" contentTab={contentTab} mounted={mountedLight.has('output')}>
            <OutputTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
          </LightTabSlot>

          <LightTabSlot tabId="penerima" contentTab={contentTab} mounted={mountedLight.has('penerima')}>
            <PenerimaTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
          </LightTabSlot>

          <LightTabSlot tabId="tiket" contentTab={contentTab} mounted={mountedLight.has('tiket')}>
            <TiketTab pekerjaanId={pekerjaanId} />
          </LightTabSlot>

          {contentTab === 'foto' ? (
            <FotoTab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
          ) : null}

          {contentTab === 'progress' ? (
            <ProgressTab pekerjaanId={pekerjaanId} tahunAnggaran={tahunAnggaran} />
          ) : null}
        </ScrollView>
      </View>
    )
  },
  (prev, next) =>
    prev.pekerjaanId === next.pekerjaanId &&
    prev.tahunAnggaran === next.tahunAnggaran &&
    prev.progressValue === next.progressValue &&
    prev.isOnline === next.isOnline &&
    prev.contentPadding === next.contentPadding &&
    prev.pekerjaan === next.pekerjaan,
)
