import { memo, useCallback, useState, type ComponentType, type ReactNode } from 'react'
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

const HEAVY_TABS = new Set<DetailTabId>(['foto', 'progress'])

type DetailTabShellProps = {
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  isOnline: boolean
  contentPadding: number
}

type TabSlotProps = {
  visible: boolean
  pekerjaan: PekerjaanDetail
  children: ReactNode
}

const TabSlot = memo(
  function TabSlot({ visible, children }: TabSlotProps) {
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
  },
  (prev, next) => {
    if (!prev.visible && !next.visible && prev.pekerjaan === next.pekerjaan) {
      return true
    }
    return prev.visible === next.visible && prev.pekerjaan === next.pekerjaan
  },
)

type MountedTabProps = {
  visible: boolean
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
  Tab: ComponentType<{ pekerjaanId: number; pekerjaan: PekerjaanDetail }>
}

const MountedPekerjaanTab = memo(
  function MountedPekerjaanTab({ visible, pekerjaan, pekerjaanId, Tab }: MountedTabProps) {
    return (
      <TabSlot visible={visible} pekerjaan={pekerjaan}>
        <Tab pekerjaanId={pekerjaanId} pekerjaan={pekerjaan} />
      </TabSlot>
    )
  },
  (prev, next) => {
    if (!prev.visible && !next.visible && prev.pekerjaan === next.pekerjaan) {
      return true
    }
    return (
      prev.visible === next.visible &&
      prev.pekerjaan === next.pekerjaan &&
      prev.pekerjaanId === next.pekerjaanId
    )
  },
)

function MountedProgressTab({
  visible,
  pekerjaan,
  pekerjaanId,
  tahunAnggaran,
}: {
  visible: boolean
  pekerjaan: PekerjaanDetail
  pekerjaanId: number
  tahunAnggaran: number
}) {
  return (
    <TabSlot visible={visible} pekerjaan={pekerjaan}>
      <ProgressTab pekerjaanId={pekerjaanId} tahunAnggaran={tahunAnggaran} />
    </TabSlot>
  )
}

const MountedProgressTabMemo = memo(MountedProgressTab, (prev, next) => {
  if (!prev.visible && !next.visible && prev.pekerjaan === next.pekerjaan) {
    return true
  }
  return (
    prev.visible === next.visible &&
    prev.pekerjaan === next.pekerjaan &&
    prev.pekerjaanId === next.pekerjaanId &&
    prev.tahunAnggaran === next.tahunAnggaran
  )
})

const MountedRingkasanTab = memo(
  function MountedRingkasanTab({ visible, pekerjaan }: { visible: boolean; pekerjaan: PekerjaanDetail }) {
    return (
      <TabSlot visible={visible} pekerjaan={pekerjaan}>
        <RingkasanTab pekerjaan={pekerjaan} />
      </TabSlot>
    )
  },
  (prev, next) => {
    if (!prev.visible && !next.visible && prev.pekerjaan === next.pekerjaan) {
      return true
    }
    return prev.visible === next.visible && prev.pekerjaan === next.pekerjaan
  },
)

const MountedTiketTab = memo(
  function MountedTiketTab({
    visible,
    pekerjaan,
    pekerjaanId,
  }: {
    visible: boolean
    pekerjaan: PekerjaanDetail
    pekerjaanId: number
  }) {
    return (
      <TabSlot visible={visible} pekerjaan={pekerjaan}>
        <TiketTab pekerjaanId={pekerjaanId} />
      </TabSlot>
    )
  },
  (prev, next) => {
    if (!prev.visible && !next.visible && prev.pekerjaan === next.pekerjaan) {
      return true
    }
    return (
      prev.visible === next.visible &&
      prev.pekerjaan === next.pekerjaan &&
      prev.pekerjaanId === next.pekerjaanId
    )
  },
)

function mountTab(prev: Set<DetailTabId>, tab: DetailTabId): Set<DetailTabId> {
  if (prev.has(tab)) return prev
  const next = new Set(prev)
  next.add(tab)
  return next
}

export const DetailTabShell = memo(function DetailTabShell({
  pekerjaan,
  pekerjaanId,
  tahunAnggaran,
  isOnline,
  contentPadding,
}: DetailTabShellProps) {
  const [activeTab, setActiveTab] = useState<DetailTabId>('ringkasan')
  const [mountedTabs, setMountedTabs] = useState<Set<DetailTabId>>(() => new Set(['ringkasan']))
  const [mountingTab, setMountingTab] = useState<DetailTabId | null>(null)

  const scheduleMount = useCallback((tab: DetailTabId) => {
    setMountingTab(tab)
    InteractionManager.runAfterInteractions(() => {
      setMountedTabs((prev) => mountTab(prev, tab))
      setMountingTab((current) => (current === tab ? null : current))
    })
  }, [])

  const handleTabChange = useCallback(
    (tab: DetailTabId) => {
      setActiveTab(tab)

      setMountedTabs((prev) => {
        if (prev.has(tab)) return prev

        if (HEAVY_TABS.has(tab)) {
          scheduleMount(tab)
          return prev
        }

        return mountTab(prev, tab)
      })
    },
    [scheduleMount],
  )

  const showMountSpinner = mountingTab === activeTab && !mountedTabs.has(activeTab)

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
        removeClippedSubviews={false}
      >
        {!isOnline ? (
          <NeoSurface tone="main" style={{ gap: 4, padding: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.foreground }}>Mode offline</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>
              Menampilkan data tersimpan di perangkat. Data akan diperbarui otomatis saat koneksi kembali.
            </Text>
          </NeoSurface>
        ) : null}

        {showMountSpinner ? <Spinner label="Membuka tab..." /> : null}

        {mountedTabs.has('ringkasan') ? (
          <MountedRingkasanTab visible={activeTab === 'ringkasan'} pekerjaan={pekerjaan} />
        ) : null}

        {mountedTabs.has('output') ? (
          <MountedPekerjaanTab
            visible={activeTab === 'output'}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
            Tab={OutputTab}
          />
        ) : null}

        {mountedTabs.has('penerima') ? (
          <MountedPekerjaanTab
            visible={activeTab === 'penerima'}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
            Tab={PenerimaTab}
          />
        ) : null}

        {mountedTabs.has('progress') ? (
          <MountedProgressTabMemo
            visible={activeTab === 'progress'}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
          />
        ) : null}

        {mountedTabs.has('foto') ? (
          <MountedPekerjaanTab
            visible={activeTab === 'foto'}
            pekerjaan={pekerjaan}
            pekerjaanId={pekerjaanId}
            tahunAnggaran={tahunAnggaran}
            Tab={FotoTab}
          />
        ) : null}

        {mountedTabs.has('tiket') ? (
          <MountedTiketTab visible={activeTab === 'tiket'} pekerjaan={pekerjaan} pekerjaanId={pekerjaanId} />
        ) : null}
      </ScrollView>
    </>
  )
})