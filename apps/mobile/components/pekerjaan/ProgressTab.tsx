import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProgressEstimasiSection, ProgressHistoryEntry } from '@pengawas/shared'
import { formatApiError } from '@pengawas/api-client'
import { formatDate, formatPercent, progressTone } from '@pengawas/shared/format'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getPekerjaanProgressEstimasi, savePekerjaanProgressEstimasi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  type FormHistories,
  type HistoryDraft,
  type ProgressJenis,
  emptyDraft,
  emptyProgressSection,
  formatPercentValue,
  historiesFromResponse,
  parsePercent,
  sanitizePercentInput,
  sortEntries,
} from '@/lib/progress-estimasi'
import { EmptyState, MetricCard, NeoBadge, NeoButton, NeoInput, NeoSurface, SectionHeader, Spinner } from '@/components/ui'
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

function SummaryStrip({
  section,
  accentTone,
}: {
  section: ProgressEstimasiSection
  accentTone: 'warning' | 'success'
}) {
  const deviasi = section.deviasi
  const deviasiTone = deviasi !== null && deviasi < 0 ? 'secondary' : 'accent'

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <MetricCard label="Rencana terakhir" value={`${formatPercentValue(section.latest_rencana)}%`} tone="card" />
      <MetricCard
        label="Realisasi terakhir"
        value={`${formatPercentValue(section.latest_realisasi)}%`}
        tone={accentTone === 'warning' ? 'main' : 'accent'}
      />
      <MetricCard
        label="Deviasi"
        value={`${formatPercentValue(deviasi)}%`}
        tone={deviasiTone}
        hint={deviasi !== null && deviasi < 0 ? 'Di bawah rencana' : 'Sesuai/ di atas rencana'}
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
    <NeoSurface style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <SectionHeader title={title} description={description} />
        <NeoBadge tone={badgeMap[badgeTone]}>{`${sorted.length} catatan`}</NeoBadge>
      </View>

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
        compact
        onPress={onAdd}
        disabled={isSaving}
      />

      {sorted.length === 0 ? (
        <EmptyState title="Belum ada riwayat" description="Tambahkan catatan dari 0% menuju 100%." />
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 13 }}>Capaian terakhir</Text>
            <ProgressFill percent={latestPercent} />
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
                gap: 8,
                backgroundColor: colors.card,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800' }}>{formatDate(entry.tanggal)}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Pencatatan #{index + 1}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
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
  return (
    <View style={{ gap: 16 }}>
      <SummaryStrip section={section} accentTone={accentTone} />
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
  )
}

export function ProgressTab({ pekerjaanId, tahunAnggaran }: ProgressTabProps) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()
  const tahun = tahunAnggaran > 0 ? tahunAnggaran : new Date().getFullYear()
  const [activeJenis, setActiveJenis] = useState<ProgressJenis>('fisik')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState({
    fisik: { rencana: emptyDraft(), realisasi: emptyDraft() },
    keuangan: { rencana: emptyDraft(), realisasi: emptyDraft() },
  })
  const [histories, setHistories] = useState<FormHistories | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.pekerjaan.progressEstimasi(pekerjaanId, tahun),
    queryFn: () => getPekerjaanProgressEstimasi(pekerjaanId, tahun),
    enabled: canFetch && pekerjaanId > 0,
  })

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
    if (!histories) return

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
      ...histories,
      [section]: {
        ...histories[section],
        [tipe]: sortEntries([...histories[section][tipe], { tanggal: draft.tanggal.trim(), persen }]),
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
    if (!histories) return

    Alert.alert('Hapus catatan', 'Catatan progress ini akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const sorted = sortEntries(histories[section][tipe])
          const nextHistories: FormHistories = {
            ...histories,
            [section]: {
              ...histories[section],
              [tipe]: sorted.filter((_, itemIndex) => itemIndex !== index),
            },
          }
          setHistories(nextHistories)
          persist(nextHistories)
        },
      },
    ])
  }

  if (isLoading || !histories) {
    return <Spinner label="Memuat riwayat progress..." />
  }

  if (isError) {
    return (
      <EmptyState
        title="Gagal memuat progress"
        description="Data progress estimasi tidak tersedia."
        actionLabel="Coba lagi"
        onAction={() => void refetch()}
      />
    )
  }

  const puspenItems = data?.puspen_progress_fisik ?? []

  return (
    <View style={{ gap: 16 }}>
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

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <NeoButton
          label="Progress Fisik"
          variant={activeJenis === 'fisik' ? 'primary' : 'neutral'}
          compact
          onPress={() => setActiveJenis('fisik')}
        />
        <NeoButton
          label="Progress Keuangan"
          variant={activeJenis === 'keuangan' ? 'primary' : 'neutral'}
          compact
          onPress={() => setActiveJenis('keuangan')}
        />
      </View>

      {activeJenis === 'fisik' ? (
        <ProgressTypePanel
          jenis="fisik"
          section={data?.data.fisik ?? emptyProgressSection}
          histories={histories.fisik}
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
          histories={histories.keuangan}
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