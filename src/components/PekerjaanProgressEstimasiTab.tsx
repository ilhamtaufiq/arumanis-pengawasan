import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, HardHat, Info, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  formatApiError,
  getPekerjaanProgressEstimasi,
  savePekerjaanProgressEstimasi,
} from '@/lib/api'
import { formatDate, formatPercent, progressTone } from '@/lib/format'
import type { ProgressEstimasiSection, ProgressHistoryEntry, PuspenProgressFisikSnapshot } from '@/lib/types'
import { Badge, Button, DetailProgressFill, FieldGroup, Input, Spinner } from '@/components/ui'

type HistoryDraft = { tanggal: string; persen: string }

type SectionHistories = {
  rencana: ProgressHistoryEntry[]
  realisasi: ProgressHistoryEntry[]
}

type FormHistories = {
  fisik: SectionHistories
  keuangan: SectionHistories
}

type ProgressJenis = 'fisik' | 'keuangan'

const emptyDraft = (): HistoryDraft => ({ tanggal: '', persen: '' })

const historiesFromResponse = (data: {
  fisik: ProgressEstimasiSection
  keuangan: ProgressEstimasiSection
}): FormHistories => ({
  fisik: { rencana: data.fisik.rencana, realisasi: data.fisik.realisasi },
  keuangan: { rencana: data.keuangan.rencana, realisasi: data.keuangan.realisasi },
})

const sanitizePercentInput = (value: string) => {
  let sanitized = value.replace(/[^0-9,.]/g, '')
  const separatorIndex = sanitized.search(/[,.]/)

  if (separatorIndex !== -1) {
    const before = sanitized.slice(0, separatorIndex)
    const separator = sanitized[separatorIndex]
    const after = sanitized.slice(separatorIndex + 1).replace(/[,.]/g, '')
    sanitized = `${before}${separator}${after}`
  }

  return sanitized
}

const parsePercent = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  if (normalized === '') return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatPercentValue = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const sortEntries = (entries: ProgressHistoryEntry[]) =>
  [...entries].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.id ?? 0) - (b.id ?? 0))

function SummaryStrip({ section, accentTone }: { section: ProgressEstimasiSection; accentTone: 'warning' | 'success' }) {
  const deviasi = section.deviasi

  return (
    <div className="detail-kpi-row">
      <div className="detail-kpi-card detail-kpi-card--info">
        <div className="detail-kpi-label">Rencana terakhir</div>
        <div className="detail-kpi-value">{formatPercentValue(section.latest_rencana)}%</div>
        <div className="detail-kpi-hint">Nilai rencana terbaru</div>
      </div>
      <div className={`detail-kpi-card detail-kpi-card--${accentTone}`}>
        <div className="detail-kpi-label">Realisasi terakhir</div>
        <div className="detail-kpi-value">{formatPercentValue(section.latest_realisasi)}%</div>
        <div className="detail-kpi-hint">Capaian terbaru</div>
      </div>
      <div className={`detail-kpi-card detail-kpi-card--${deviasi !== null && deviasi < 0 ? 'danger' : 'success'}`}>
        <div className="detail-kpi-label">Deviasi</div>
        <div className="detail-kpi-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {deviasi !== null && deviasi < 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
          {formatPercentValue(deviasi)}%
        </div>
        <div className="detail-kpi-hint">Selisih realisasi dan rencana</div>
      </div>
    </div>
  )
}

function HistoryColumn({
  title,
  subtitle,
  entries,
  draft,
  badgeTone,
  isSaving,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  title: string
  subtitle: string
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

  return (
    <div className="progress-estimasi-column detail-section-full">
      <div className="detail-tab-header">
        <div className="detail-tab-header-left">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Badge tone={badgeTone}>{sorted.length} catatan</Badge>
      </div>

      <form
        className="progress-estimasi-add-form"
        onSubmit={(event) => {
          event.preventDefault()
          onAdd()
        }}
      >
        <FieldGroup label="Tanggal">
          <Input
            type="date"
            value={draft.tanggal}
            onChange={(event) => onDraftChange({ ...draft, tanggal: event.target.value })}
            disabled={isSaving}
          />
        </FieldGroup>
        <FieldGroup label="Nilai (%)">
          <Input
            type="text"
            inputMode="decimal"
            value={draft.persen}
            onChange={(event) => onDraftChange({ ...draft, persen: sanitizePercentInput(event.target.value) })}
            placeholder="0-100"
            disabled={isSaving}
          />
        </FieldGroup>
        <div className="progress-estimasi-add-action">
          <Button type="submit" size="sm" isLoading={isSaving} disabled={isSaving}>
            <Plus size={14} />
            <span>Tambah</span>
          </Button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">Belum ada riwayat</div>
          <div className="empty-state-copy">Tambahkan catatan dari 0% menuju 100%.</div>
        </div>
      ) : (
        <div className="stack stack--compact">
          <div className="progress-estimasi-capai">
            <span>Capaian</span>
            <div className="progress-estimasi-capai-track">
              <DetailProgressFill percent={latestPercent} />
            </div>
            <strong>{formatPercentValue(latestPercent)}%</strong>
          </div>

          <div className="progress-estimasi-history-list">
            {sorted.map((entry, index) => (
              <div key={`${entry.tanggal}-${entry.persen}-${index}`} className="progress-estimasi-history-item">
                <div className="progress-estimasi-history-main">
                  <div className="progress-estimasi-history-date">{formatDate(entry.tanggal)}</div>
                  <div className="progress-estimasi-history-meta">Pencatatan #{index + 1}</div>
                </div>
                <div className="progress-estimasi-history-side">
                  <strong className="progress-estimasi-history-value">{formatPercentValue(entry.persen)}%</strong>
                  <Badge tone={progressTone(entry.persen) as 'danger' | 'warning' | 'success'}>
                    {formatPercent(entry.persen)}
                  </Badge>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="progress-estimasi-delete-btn"
                    onClick={() => onRemove(index)}
                    disabled={isSaving}
                    aria-label={`Hapus catatan ${formatDate(entry.tanggal)}`}
                  >
                    <Trash2 size={14} />
                    <span className="progress-estimasi-delete-label">Hapus</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  histories: SectionHistories
  drafts: { rencana: HistoryDraft; realisasi: HistoryDraft }
  accentTone: 'warning' | 'success'
  isSaving: boolean
  onDraftChange: (tipe: 'rencana' | 'realisasi', draft: HistoryDraft) => void
  onAdd: (tipe: 'rencana' | 'realisasi') => void
  onRemove: (tipe: 'rencana' | 'realisasi', index: number) => void
}) {
  return (
    <div className="stack stack--compact">
      <SummaryStrip section={section} accentTone={accentTone} />
      <div className="progress-estimasi-columns">
        <HistoryColumn
          title="Rencana"
          subtitle={`Target ${jenis} per tanggal`}
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
          subtitle={`Capaian ${jenis} per tanggal`}
          entries={histories.realisasi}
          draft={drafts.realisasi}
          badgeTone={accentTone}
          isSaving={isSaving}
          onDraftChange={(draft) => onDraftChange('realisasi', draft)}
          onAdd={() => onAdd('realisasi')}
          onRemove={(index) => onRemove('realisasi', index)}
        />
      </div>
    </div>
  )
}

type PekerjaanProgressEstimasiTabProps = {
  pekerjaanId: number
  tahunAnggaran: number
  onError?: (message: string) => void
  onProgressChange?: (latestFisikRealisasi: number | null) => void
}

export function PekerjaanProgressEstimasiTab({
  pekerjaanId,
  tahunAnggaran,
  onError,
  onProgressChange,
}: PekerjaanProgressEstimasiTabProps) {
  const queryClient = useQueryClient()
  const tahun = tahunAnggaran > 0 ? tahunAnggaran : new Date().getFullYear()
  const [activeJenis, setActiveJenis] = useState<ProgressJenis>('fisik')
  const [drafts, setDrafts] = useState({
    fisik: { rencana: emptyDraft(), realisasi: emptyDraft() },
    keuangan: { rencana: emptyDraft(), realisasi: emptyDraft() },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['pekerjaan', 'progress-estimasi', pekerjaanId, tahun],
    queryFn: () => getPekerjaanProgressEstimasi(pekerjaanId, tahun),
    enabled: pekerjaanId > 0,
  })

  const [histories, setHistories] = useState<FormHistories | null>(null)

  useEffect(() => {
    if (!data?.data) return
    setHistories(historiesFromResponse(data.data))
    onProgressChange?.(data.data.fisik.latest_realisasi)
  }, [data, onProgressChange])

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
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress-estimasi', pekerjaanId] })
      onProgressChange?.(response.data.fisik.latest_realisasi)
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal menyimpan perubahan progress.'))
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

    if (!draft.tanggal) {
      onError?.('Tanggal wajib diisi')
      return
    }

    if (persen === null || persen < 0 || persen > 100) {
      onError?.('Nilai harus antara 0 dan 100')
      return
    }

    const nextHistories: FormHistories = {
      ...histories,
      [section]: {
        ...histories[section],
        [tipe]: sortEntries([...histories[section][tipe], { tanggal: draft.tanggal, persen }]),
      },
    }

    setHistories(nextHistories)
    setDrafts((current) => ({
      ...current,
      [section]: { ...current[section], [tipe]: emptyDraft() },
    }))

    persist(nextHistories)
  }

  const handleRemove = (section: ProgressJenis, tipe: 'rencana' | 'realisasi', index: number) => {
    if (!histories) return

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
  }

  const puspenItems = data?.puspen_progress_fisik ?? []
  const emptySection: ProgressEstimasiSection = {
    rencana: [],
    realisasi: [],
    latest_rencana: null,
    latest_realisasi: null,
    deviasi: null,
  }

  if (isLoading || !histories) {
    return (
      <div className="detail-section-full detail-section-loading">
        <Spinner />
        <span>Memuat riwayat progress...</span>
      </div>
    )
  }

  return (
    <div className="progress-estimasi-tab stack stack--compact">
      {puspenItems.length > 0 ? (
        <div className="detail-section-full progress-estimasi-puspen">
          <div className="detail-tab-header">
            <div className="detail-tab-header-left">
              <h2>
                <Info size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                Referensi Puspen
              </h2>
              <p>
                Progress fisik disinkronkan dua arah dengan Puspen. Nilai terakhir di sini memperbarui halaman
                Puspen progress fisik untuk kontrak terkait.
              </p>
            </div>
          </div>
          <div className="badge-row-inline">
            {puspenItems.map((item: PuspenProgressFisikSnapshot) => (
              <Badge key={item.kontrak_id} tone="neutral">
                {item.kode_paket || `Kontrak #${item.kontrak_id}`}: Rencana {formatPercentValue(item.rencana)}% - Realisasi{' '}
                {formatPercentValue(item.realisasi)}%
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="progress-estimasi-subtabs" role="tablist" aria-label="Jenis progress">
        <button
          type="button"
          role="tab"
          aria-selected={activeJenis === 'fisik'}
          className="detail-tab-pill"
          onClick={() => setActiveJenis('fisik')}
        >
          <HardHat size={14} />
          <span>Progress Fisik</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeJenis === 'keuangan'}
          className="detail-tab-pill"
          onClick={() => setActiveJenis('keuangan')}
        >
          <Banknote size={14} />
          <span>Progress Keuangan</span>
        </button>
      </nav>

      {activeJenis === 'fisik' ? (
        <ProgressTypePanel
          jenis="fisik"
          section={data?.data.fisik ?? emptySection}
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
          section={data?.data.keuangan ?? emptySection}
          histories={histories.keuangan}
          drafts={drafts.keuangan}
          accentTone="success"
          isSaving={saveMutation.isPending}
          onDraftChange={(tipe, draft) => handleDraftChange('keuangan', tipe, draft)}
          onAdd={(tipe) => handleAdd('keuangan', tipe)}
          onRemove={(tipe, index) => handleRemove('keuangan', tipe, index)}
        />
      )}
    </div>
  )
}