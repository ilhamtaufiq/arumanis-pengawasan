import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, Text, View, type DimensionValue, type LayoutChangeEvent } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProgressEstimasiSection, ProgressHistoryEntry } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { formatDate, formatPercent, progressTone } from '@pengawas/shared/format'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getPekerjaanProgressEstimasi, savePekerjaanProgressEstimasi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { shouldShowInitialQuerySpinner, shouldShowQueryEmptyFallback } from '@/lib/query-ui'
import {
  type FormHistories,
  type HistoryDraft,
  type ProgressJenis,
  createEmptyProgressEstimasiResponse,
  emptyDraft,
  emptyHistories,
  emptyProgressSection,
  formatPercentValue,
  historiesFromResponse,
  parsePercent,
  sanitizePercentInput,
  sortEntries,
} from '@/lib/progress-estimasi'
import { EmptyState, MetricCard, NeoBadge, NeoButton, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
import { useResponsive } from '@/lib/responsive'
import { colors, radius } from '@/theme/tokens'

type ProgressTabProps = {
  pekerjaanId: number
  tahunAnggaran: number
}

function ProgressFill({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <View
      style={{
        height: 10,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: colors.main,
        }}
      />
    </View>
  )
}

function SummaryMetricSlot({ children, width }: { children: ReactNode; width: DimensionValue }) {
  return <View style={{ width, minWidth: 0, flexGrow: 1, maxWidth: '100%' }}>{children}</View>
}

function SummaryStrip({
  section,
  accentTone,
}: {
  section: ProgressEstimasiSection
  accentTone: 'warning' | 'success'
}) {
  const { isNarrow, isCompact } = useResponsive()
  const deviasi = section.deviasi
  const deviasiTone = deviasi !== null && deviasi < 0 ? 'secondary' : 'accent'
  const slotWidth = isNarrow ? '100%' : isCompact ? '48%' : '31%'

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' }}>
      <SummaryMetricSlot width={slotWidth}>
        <MetricCard label="Rencana terakhir" value={`${formatPercentValue(section.latest_rencana)}%`} tone="card" />
      </SummaryMetricSlot>
      <SummaryMetricSlot width={slotWidth}>
        <MetricCard
          label="Realisasi terakhir"
          value={`${formatPercentValue(section.latest_realisasi)}%`}
          tone={accentTone === 'warning' ? 'main' : 'accent'}
        />
      </SummaryMetricSlot>
      <SummaryMetricSlot width={slotWidth}>
        <MetricCard
          label="Deviasi"
          value={`${formatPercentValue(deviasi)}%`}
          tone={deviasiTone}
          hint={deviasi !== null && deviasi < 0 ? 'Di bawah rencana' : 'Sesuai/ di atas rencana'}
        />
      </SummaryMetricSlot>
    </View>
  )
}

function ProgressAddForm({
  draft,
  isSaving,
  onDraftChange,
  onAdd,
}: {
  draft: HistoryDraft
  isSaving: boolean
  onDraftChange: (draft: HistoryDraft) => void
  onAdd: () => void
}) {
  const [containerWidth, setContainerWidth] = useState(0)
  const useRowLayout = containerWidth >= 400

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width)
    setContainerWidth((current) => (current === nextWidth ? current : nextWidth))
  }

  if (useRowLayout) {
    return (
      <View
        onLayout={handleLayout}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', width: '100%', minWidth: 0 }}
      >
        <View style={{ flex: 1, minWidth: 140, maxWidth: '100%' }}>
          <NeoInput
            label="Tanggal"
            placeholder="YYYY-MM-DD"
            value={draft.tanggal}
            onChangeText={(tanggal) => onDraftChange({ ...draft, tanggal })}
            editable={!isSaving}
          />
        </View>
        <View style={{ width: 112, minWidth: 88, maxWidth: '100%', flexShrink: 0 }}>
          <NeoInput
            label="Nilai (%)"
            placeholder="0-100"
            keyboardType="decimal-pad"
            value={draft.persen}
            onChangeText={(persen) => onDraftChange({ ...draft, persen: sanitizePercentInput(persen) })}
            editable={!isSaving}
          />
        </View>
        <View style={{ minWidth: 96, flexGrow: 1, flexBasis: 96, maxWidth: '100%' }}>
          <NeoButton
            label={isSaving ? 'Menyimpan...' : 'Tambah'}
            compact
            fullWidth
            onPress={onAdd}
            disabled={isSaving}
          />
        </View>
      </View>
    )
  }

  return (
    <View onLayout={handleLayout} style={{ gap: 10, width: '100%', minWidth: 0 }}>
      <NeoInput
        label="Tanggal"
        placeholder="YYYY-MM-DD"
        value={draft.tanggal}
        onChangeText={(tanggal) => onDraftChange({ ...draft, tanggal })}
        editable={!isSaving}
      />
      <NeoInput
        label="Nilai (%)"
        placeholder="0-100"
        keyboardType="decimal-pad"
        value={draft.persen}
        onChangeText={(persen) => onDraftChange({ ...draft, persen: sanitizePercentInput(persen) })}
        editable={!isSaving}
      />
      <NeoButton
        label={isSaving ? 'Menyimpan...' : 'Tambah'}
        fullWidth
        onPress={onAdd}
        disabled={isSaving}
      />
    </View>
  )
}

function HistoryColumn({
  title,
  description,
  entries,
  draft,
  badgeTone,
  isSaving,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  title: string
  description: string
  entries: ProgressHistoryEntry[]
  draft: HistoryDraft
  badgeTone: 'warning' | 'success' | 'info'
  isSaving: boolean
  onDraftChange: (draft: HistoryDraft) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const sorted = sortEntries(entries)
  const latestPercent = sorted[sorted.length - 1]?.persen ?? 0
  const badgeMap = { warning: 'warning' as const, success: 'success' as const, info: 'info' as const }

  return (
    <NeoSurface style={{ gap: 12, width: '100%', minWidth: 0, alignSelf: 'stretch' }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          width: '100%',
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{title}</Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, lineHeight: 18 }}>{description}</Text>
        </View>
        <NeoBadge tone={badgeMap[badgeTone]}>{`${sorted.length} catatan`}</NeoBadge>
      </View>

      <ProgressAddForm draft={draft} isSaving={isSaving} onDraftChange={onDraftChange} onAdd={onAdd} />

      {sorted.length === 0 ? (
        <EmptyState title="Belum ada riwayat" description="Tambahkan catatan dari 0% menuju 100%." />
      ) : (
        <View style={{ gap: 10, width: '100%' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, width: '100%' }}>
            <Text style={{ fontWeight: '700', fontSize: 13 }}>Capaian terakhir</Text>
            <View style={{ flex: 1, minWidth: 120 }}>
              <ProgressFill percent={latestPercent} />
            </View>
            <Text style={{ fontWeight: '800' }}>{formatPercentValue(latestPercent)}%</Text>
          </View>

          {sorted.map((entry, index) => (
            <View
              key={`${entry.tanggal}-${entry.persen}-${index}`}
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                padding: 12,
                gap: 10,
                backgroundColor: colors.card,
                width: '100%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                }}
              >
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={{ fontWeight: '800' }}>{formatDate(entry.tanggal)}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Pencatatan #{index + 1}</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16 }}>{formatPercentValue(entry.persen)}%</Text>
                  <NeoBadge tone={progressTone(entry.persen) as 'danger' | 'warning' | 'success'}>
                    {formatPercent(entry.persen)}
                  </NeoBadge>
                </View>
              </View>
              <NeoButton
                label="Hapus"
                variant="danger"
                compact
                fullWidth
                disabled={isSaving}
                onPress={() => onRemove(index)}
              />
            </View>
          ))}
        </View>
      )}
    </NeoSurface>
  )
}

function ProgressTypePanel({
  jenis,
  section,
  histories,
  drafts,
  accentTone,
  isSaving,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  jenis: ProgressJenis
  section: ProgressEstimasiSection
  histories: FormHistories['fisik']
  drafts: { rencana: HistoryDraft; realisasi: HistoryDraft }
  accentTone: 'warning' | 'success'
  isSaving: boolean
  onDraftChange: (tipe: 'rencana' | 'realisasi', draft: HistoryDraft) => void
  onAdd: (tipe: 'rencana' | 'realisasi') => void
  onRemove: (tipe: 'rencana' | 'realisasi', index: number) => void
}) {
  const { isTablet } = useResponsive()
  const columnStyle = isTablet ? { flex: 1, minWidth: 0 } : { width: '100%' as const }

  return (
    <View style={{ gap: 16, width: '100%', minWidth: 0 }}>
      <SummaryStrip section={section} accentTone={accentTone} />
      <View
        style={{
          flexDirection: isTablet ? 'row' : 'column',
          alignItems: 'stretch',
          gap: 12,
          width: '100%',
        }}
      >
        <View style={columnStyle}>
          <HistoryColumn
            title="Rencana"
            description={`Target ${jenis} per tanggal`}
            entries={histories.rencana}
            draft={drafts.rencana}
            badgeTone="warning"
            isSaving={isSaving}
            onDraftChange={(draft) => onDraftChange('rencana', draft)}
            onAdd={() => onAdd('rencana')}
            onRemove={(index) => onRemove('rencana', index)}
          />
        </View>
        <View style={columnStyle}>
          <HistoryColumn
            title="Realisasi"
            description={`Capaian ${jenis} per tanggal`}
            entries={histories.realisasi}
            draft={drafts.realisasi}
            badgeTone={accentTone}
            isSaving={isSaving}
            onDraftChange={(draft) => onDraftChange('realisasi', draft)}
            onAdd={() => onAdd('realisasi')}
            onRemove={(index) => onRemove('realisasi', index)}
          />
        </View>
      </View>
    </View>
  )
}

export function ProgressTab({ pekerjaanId, tahunAnggaran }: ProgressTabProps) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()
  const { isCompact } = useResponsive()
  const tahun = tahunAnggaran > 0 ? tahunAnggaran : new Date().getFullYear()
  const [activeJenis, setActiveJenis] = useState<ProgressJenis>('fisik')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState({
    fisik: { rencana: emptyDraft(), realisasi: emptyDraft() },
    keuangan: { rencana: emptyDraft(), realisasi: emptyDraft() },
  })
  const [histories, setHistories] = useState<FormHistories | null>(null)

  const emptyResponse = useMemo(
    () => createEmptyProgressEstimasiResponse(pekerjaanId, tahun),
    [pekerjaanId, tahun],
  )

  const progressQuery = useQuery({
    queryKey: queryKeys.pekerjaan.progressEstimasi(pekerjaanId, tahun),
    queryFn: () => getPekerjaanProgressEstimasi(pekerjaanId, tahun),
    enabled: canFetch && pekerjaanId > 0,
    retry: false,
    networkMode: 'offlineFirst',
    placeholderData: () => emptyResponse,
  })

  const { data, isError, refetch } = progressQuery

  const cachedHistories = useMemo(
    () => historiesFromResponse(data?.data ?? emptyResponse.data),
    [data, emptyResponse.data],
  )
  const activeHistories = histories ?? cachedHistories ?? emptyHistories()

  useEffect(() => {
    if (!data?.data) return
    setHistories(historiesFromResponse(data.data))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (nextHistories: FormHistories) =>
      savePekerjaanProgressEstimasi(pekerjaanId, {
        tahun,
        fisik: {
          rencana: nextHistories.fisik.rencana.map(({ tanggal, persen }) => ({ tanggal, persen })),
          realisasi: nextHistories.fisik.realisasi.map(({ tanggal, persen }) => ({ tanggal, persen })),
        },
        keuangan: {
          rencana: nextHistories.keuangan.rencana.map(({ tanggal, persen }) => ({ tanggal, persen })),
          realisasi: nextHistories.keuangan.realisasi.map(({ tanggal, persen }) => ({ tanggal, persen })),
        },
      }),
    onSuccess: async () => {
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.progressEstimasi(pekerjaanId, tahun) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.detail(pekerjaanId) })
    },
    onError: (error) => {
      setErrorMessage(formatApiError(error, 'Gagal menyimpan perubahan progress.'))
    },
  })

  const persist = (nextHistories: FormHistories) => {
    saveMutation.mutate(nextHistories)
  }

  const handleDraftChange = (section: ProgressJenis, tipe: 'rencana' | 'realisasi', draft: HistoryDraft) => {
    setDrafts((current) => ({
      ...current,
      [section]: { ...current[section], [tipe]: draft },
    }))
  }

  const handleAdd = (section: ProgressJenis, tipe: 'rencana' | 'realisasi') => {
    if (!activeHistories) return

    const draft = drafts[section][tipe]
    const persen = parsePercent(draft.persen)

    if (!draft.tanggal.trim()) {
      setErrorMessage('Tanggal wajib diisi')
      return
    }

    if (persen === null || persen < 0 || persen > 100) {
      setErrorMessage('Nilai harus antara 0 dan 100')
      return
    }

    const nextHistories: FormHistories = {
      ...activeHistories,
      [section]: {
        ...activeHistories[section],
        [tipe]: sortEntries([...activeHistories[section][tipe], { tanggal: draft.tanggal.trim(), persen }]),
      },
    }

    setHistories(nextHistories)
    setDrafts((current) => ({
      ...current,
      [section]: { ...current[section], [tipe]: emptyDraft() },
    }))
    setErrorMessage(null)
    persist(nextHistories)
  }

  const handleRemove = (section: ProgressJenis, tipe: 'rencana' | 'realisasi', index: number) => {
    if (!activeHistories) return

    Alert.alert('Hapus catatan', 'Catatan progress ini akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const sorted = sortEntries(activeHistories[section][tipe])
          const nextHistories: FormHistories = {
            ...activeHistories,
            [section]: {
              ...activeHistories[section],
              [tipe]: sorted.filter((_, itemIndex) => itemIndex !== index),
            },
          }
          setHistories(nextHistories)
          persist(nextHistories)
        },
      },
    ])
  }

  if (shouldShowInitialQuerySpinner(progressQuery)) {
    return <Spinner label="Memuat riwayat progress..." />
  }

  if (shouldShowQueryEmptyFallback(progressQuery)) {
    return (
      <EmptyState
        title="Gagal memuat progress"
        description="Data progress estimasi belum tersimpan di perangkat. Buka tab ini sekali saat online agar tersimpan untuk mode offline."
        actionLabel="Coba lagi"
        onAction={() => void refetch()}
      />
    )
  }

  const puspenItems = data?.puspen_progress_fisik ?? []

  return (
    <View style={{ gap: 16, width: '100%', minWidth: 0, alignSelf: 'stretch' }}>
      {isError ? (
        <NeoSurface tone="secondary" style={{ gap: 8, padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>
            Gagal memuat data terbaru. Menampilkan data tersimpan atau kosong.
          </Text>
          <NeoButton label="Coba lagi" variant="neutral" compact onPress={() => void refetch()} />
        </NeoSurface>
      ) : null}

      {errorMessage ? (
        <NeoSurface tone="secondary" style={{ padding: 12 }}>
          <Text style={{ fontWeight: '700' }}>{errorMessage}</Text>
        </NeoSurface>
      ) : null}

      <NeoBadge tone="neutral">{`Tahun anggaran ${tahun}`}</NeoBadge>

      {puspenItems.length > 0 ? (
        <NeoSurface style={{ gap: 10 }}>
          <SectionHeader
            title="Referensi Puspen"
            description="Progress fisik disinkronkan dengan Puspen untuk kontrak terkait."
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {puspenItems.map((item) => (
              <NeoBadge key={item.kontrak_id} tone="neutral">
                {`${item.kode_paket || `Kontrak #${item.kontrak_id}`}: R ${formatPercentValue(item.rencana)}% · Real ${formatPercentValue(item.realisasi)}%`}
              </NeoBadge>
            ))}
          </View>
        </NeoSurface>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' }}>
        <View style={{ flex: 1, minWidth: isCompact ? 140 : 160 }}>
          <NeoButton
            label="Progress Fisik"
            variant={activeJenis === 'fisik' ? 'primary' : 'neutral'}
            compact
            fullWidth
            onPress={() => setActiveJenis('fisik')}
          />
        </View>
        <View style={{ flex: 1, minWidth: isCompact ? 140 : 160 }}>
          <NeoButton
            label="Progress Keuangan"
            variant={activeJenis === 'keuangan' ? 'primary' : 'neutral'}
            compact
            fullWidth
            onPress={() => setActiveJenis('keuangan')}
          />
        </View>
      </View>

      {activeJenis === 'fisik' ? (
        <ProgressTypePanel
          jenis="fisik"
          section={data?.data.fisik ?? emptyProgressSection}
          histories={activeHistories.fisik}
          drafts={drafts.fisik}
          accentTone="warning"
          isSaving={saveMutation.isPending}
          onDraftChange={(tipe, draft) => handleDraftChange('fisik', tipe, draft)}
          onAdd={(tipe) => handleAdd('fisik', tipe)}
          onRemove={(tipe, index) => handleRemove('fisik', tipe, index)}
        />
      ) : (
        <ProgressTypePanel
          jenis="keuangan"
          section={data?.data.keuangan ?? emptyProgressSection}
          histories={activeHistories.keuangan}
          drafts={drafts.keuangan}
          accentTone="success"
          isSaving={saveMutation.isPending}
          onDraftChange={(tipe, draft) => handleDraftChange('keuangan', tipe, draft)}
          onAdd={(tipe) => handleAdd('keuangan', tipe)}
          onRemove={(tipe, index) => handleRemove('keuangan', tipe, index)}
        />
      )}
    </View>
  )
}