import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Eraser,
  FileDown,
  Plus,
  Save,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import {
  formatApiError,
  getMasterFasePekerjaan,
  getProgressReport,
  updateProgress,
} from '@/lib/api'
import { formatPercent, progressTone } from '@/lib/format'
import type { ProgressItem, ProgressReportView } from '@/lib/types'
import { trackPengawasEvent } from '@/lib/analytics/visitor-events'
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  FieldGroup,
  Input,
  Label,
  Spinner,
} from '@/components/ui'
import { ImportNegoDialog } from '@/components/ImportNegoDialog'
import { AutofillRencanaDialog } from '@/components/AutofillRencanaDialog'
import { ExportLaporanDialog } from '@/components/ExportLaporanDialog'
import type { NegoImportResult } from '@/lib/nego-import'
import {
  applyRencanaAutofillPlan,
  buildRencanaAutofillPlan,
  type MasterFasePekerjaan,
  type RencanaAutofillPlan,
} from '@/lib/rencana-autofill'

type ProgressItemGroup = {
  groupName: string
  items: Array<{ item: ProgressItem; originalIndex: number }>
}

function groupProgressItems(items: ProgressItem[]): ProgressItemGroup[] {
  const result: ProgressItemGroup[] = []
  const seen = new Set<string>()

  items.forEach((item, originalIndex) => {
    const groupName = item.nama_item?.trim() || 'Tanpa Kategori'
    if (!seen.has(groupName)) {
      seen.add(groupName)
      result.push({ groupName, items: [{ item, originalIndex }] })
      return
    }
    const group = result.find((entry) => entry.groupName === groupName)
    group?.items.push({ item, originalIndex })
  })

  return result
}

type PendingDestructive =
  | { type: 'item'; index: number; label: string }
  | { type: 'group'; groupName: string; count: number }
  | { type: 'empty' }
  | null

const SATUAN_OPTIONS = ['Unit', 'Meter', 'Meter Persegi', 'Meter Kubik'] as const

type ProgressItemFormState = {
  nama_item: string
  rincian_item: string
  satuan: string
  target_volume: string
  harga_satuan: string
  bobot: string
}

const EMPTY_PROGRESS_ITEM_FORM: ProgressItemFormState = {
  nama_item: '',
  rincian_item: '',
  satuan: '',
  target_volume: '',
  harga_satuan: '',
  bobot: '',
}

function buildProgressItemPayload(
  item: ProgressItem,
  index: number,
  editedProgress: Record<string, { rencana?: string; realisasi?: string }>,
  activeWeek: number,
) {
  const edits = editedProgress[`${index}`]
  const weekData = { ...(item.weekly_data ?? {}) }
  const weekKey = String(activeWeek)
  const existing = weekData[weekKey] ?? {}
  weekData[weekKey] = {
    rencana: edits?.rencana !== undefined ? parseFloat(edits.rencana) || null : existing.rencana ?? null,
    realisasi: edits?.realisasi !== undefined ? parseFloat(edits.realisasi) || null : existing.realisasi ?? null,
  }
  return {
    nama_item: item.nama_item,
    rincian_item: item.rincian_item,
    satuan: item.satuan,
    harga_satuan: item.harga_satuan,
    bobot: item.bobot,
    target_volume: item.target_volume,
    weekly_data: weekData,
  }
}

function buildProgressItemsPayload(
  items: ProgressItem[],
  editedProgress: Record<string, { rencana?: string; realisasi?: string }>,
  activeWeek: number,
) {
  return items.map((item, index) => buildProgressItemPayload(item, index, editedProgress, activeWeek))
}

function stringValue(value?: number | string | null) {
  if (value === undefined || value === null) return '-'
  const text = `${value}`.trim()
  return text || '-'
}

type PekerjaanLaporanMingguanFormProps = {
  pekerjaanId: number
  onError?: (message: string) => void
  onProgressChange?: (value: number) => void
}

export function PekerjaanLaporanMingguanForm({
  pekerjaanId,
  onError,
  onProgressChange,
}: PekerjaanLaporanMingguanFormProps) {
  const queryClient = useQueryClient()
  const [activeWeek, setActiveWeek] = useState(1)
  const [editedProgress, setEditedProgress] = useState<Record<string, { rencana?: string; realisasi?: string }>>({})
  const [progressSaved, setProgressSaved] = useState(false)
  const [progressItemForm, setProgressItemForm] = useState<ProgressItemFormState>(EMPTY_PROGRESS_ITEM_FORM)
  const [importNegoOpen, setImportNegoOpen] = useState(false)
  const [importFeedback, setImportFeedback] = useState<string | null>(null)
  const [offerAutofill, setOfferAutofill] = useState(false)
  const [autofillOpen, setAutofillOpen] = useState(false)
  const [autofillPlan, setAutofillPlan] = useState<RencanaAutofillPlan | null>(null)
  const [autofillPreparing, setAutofillPreparing] = useState(false)
  /** Snapshot item terbaru (mis. hasil import) agar autofill tidak nunggu refetch */
  const [autofillSourceItems, setAutofillSourceItems] = useState<ProgressItem[] | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingDestructive, setPendingDestructive] = useState<PendingDestructive>(null)

  const progressQuery = useQuery({
    queryKey: ['pekerjaan', 'progress', pekerjaanId],
    queryFn: () => getProgressReport(pekerjaanId),
    enabled: pekerjaanId > 0,
  })

  const progressView = progressQuery.data as ProgressReportView | undefined
  const progressItems = progressView?.items ?? []
  const maxWeek = Math.max(1, Number(progressView?.max_minggu ?? 1))
  /** Minimal 4 minggu agar distribusi rencana bermakna setelah import Nego */
  const scheduleWeekCount = Math.max(1, maxWeek, 4)
  const weekOptions = Array.from({ length: maxWeek }, (_, index) => index + 1)
  const groupedItems = useMemo(() => groupProgressItems(progressItems), [progressItems])

  useEffect(() => {
    if (activeWeek > maxWeek) {
      setActiveWeek(maxWeek)
    }
  }, [activeWeek, maxWeek])

  useEffect(() => {
    const total = Number(progressView?.totals?.total_weighted_progress ?? 0)
    onProgressChange?.(total)
  }, [progressView?.totals?.total_weighted_progress, onProgressChange])

  const updateProgressMutation = useMutation({
    mutationFn: () => {
      const items = buildProgressItemsPayload(progressItems, editedProgress, activeWeek)
      return updateProgress(pekerjaanId, { items, week_count: maxWeek })
    },
    onSuccess: async () => {
      void trackPengawasEvent('laporan_submit', {
        pekerjaan_id: pekerjaanId,
        week: activeWeek,
      })
      setEditedProgress({})
      setProgressSaved(true)
      window.setTimeout(() => setProgressSaved(false), 2000)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal menyimpan laporan mingguan.'))
    },
  })

  const addProgressItemMutation = useMutation({
    mutationFn: (input: ProgressItemFormState) => {
      const existingItems = buildProgressItemsPayload(progressItems, editedProgress, activeWeek)
      const newItem = {
        nama_item: input.nama_item.trim(),
        rincian_item: input.rincian_item.trim() || null,
        satuan: input.satuan,
        harga_satuan: input.harga_satuan.trim() ? parseFloat(input.harga_satuan) || null : null,
        bobot: input.bobot.trim() ? parseFloat(input.bobot) || null : null,
        target_volume: input.target_volume.trim() ? parseFloat(input.target_volume) || null : null,
        weekly_data: {},
      }
      return updateProgress(pekerjaanId, { items: [...existingItems, newItem], week_count: maxWeek })
    },
    onSuccess: async () => {
      setProgressItemForm(EMPTY_PROGRESS_ITEM_FORM)
      setEditedProgress({})
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal menambah item pekerjaan.'))
    },
  })

  const importNegoMutation = useMutation({
    mutationFn: (items: ProgressItem[]) => {
      return updateProgress(pekerjaanId, {
        items: items.map((item) => ({
          nama_item: item.nama_item ?? 'Tanpa Kategori',
          rincian_item: item.rincian_item ?? null,
          satuan: item.satuan ?? '-',
          harga_satuan: item.harga_satuan ?? null,
          bobot: item.bobot ?? null,
          target_volume: item.target_volume ?? null,
          weekly_data: item.weekly_data ?? {},
        })),
        week_count: scheduleWeekCount,
      })
    },
    onSuccess: async (_data, variables) => {
      void trackPengawasEvent('laporan_import_nego', {
        pekerjaan_id: pekerjaanId,
        item_count: variables.length,
      })
      setEditedProgress({})
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal menyimpan hasil import Nego.'))
    },
  })

  const autofillRencanaMutation = useMutation({
    mutationFn: (input: { items: ProgressItem[]; weekCount: number }) => {
      return updateProgress(pekerjaanId, {
        items: input.items.map((item) => ({
          nama_item: item.nama_item ?? 'Tanpa Kategori',
          rincian_item: item.rincian_item ?? null,
          satuan: item.satuan ?? '-',
          harga_satuan: item.harga_satuan ?? null,
          bobot: item.bobot ?? null,
          target_volume: item.target_volume ?? null,
          weekly_data: item.weekly_data ?? {},
        })),
        week_count: input.weekCount,
      })
    },
    onSuccess: async (_data, variables) => {
      void trackPengawasEvent('laporan_autofill_rencana', {
        pekerjaan_id: pekerjaanId,
        item_count: variables.items.length,
        week_count: variables.weekCount,
      })
      setEditedProgress({})
      setAutofillOpen(false)
      setAutofillPlan(null)
      setOfferAutofill(false)
      setAutofillSourceItems(null)
      setImportFeedback(
        `Rencana otomatis diisi untuk ${variables.items.length} item · ${variables.weekCount} minggu.`,
      )
      window.setTimeout(() => setImportFeedback(null), 8000)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal menyimpan rencana autofill.'))
    },
  })

  /** Ganti daftar item (hapus / kosongkan) — merge edit mingguan yang belum disimpan. */
  const replaceItemsMutation = useMutation({
    mutationFn: (items: ProgressItem[]) => {
      return updateProgress(pekerjaanId, {
        items: items.map((item) => ({
          nama_item: item.nama_item ?? 'Tanpa Kategori',
          rincian_item: item.rincian_item ?? null,
          satuan: item.satuan ?? '-',
          harga_satuan: item.harga_satuan ?? null,
          bobot: item.bobot ?? null,
          target_volume: item.target_volume ?? null,
          weekly_data: item.weekly_data ?? {},
        })),
        week_count: Math.max(1, maxWeek),
      })
    },
    onSuccess: async (_data, variables) => {
      setEditedProgress({})
      setPendingDestructive(null)
      setImportFeedback(
        variables.length === 0
          ? 'Semua item pekerjaan dikosongkan.'
          : `Daftar item diperbarui (${variables.length} item).`,
      )
      window.setTimeout(() => setImportFeedback(null), 5000)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
    onError: (error) => {
      onError?.(formatApiError(error, 'Gagal memperbarui item pekerjaan.'))
    },
  })

  function itemsWithCurrentEdits(): ProgressItem[] {
    return progressItems.map((item, index) => {
      const edits = editedProgress[`${index}`]
      if (!edits) return item
      const weekKey = String(activeWeek)
      const weekData = { ...(item.weekly_data ?? {}) }
      const existing = weekData[weekKey] ?? {}
      weekData[weekKey] = {
        rencana:
          edits.rencana !== undefined
            ? parseFloat(edits.rencana) || null
            : (existing.rencana ?? null),
        realisasi:
          edits.realisasi !== undefined
            ? parseFloat(edits.realisasi) || null
            : (existing.realisasi ?? null),
      }
      return { ...item, weekly_data: weekData }
    })
  }

  function confirmDestructive() {
    if (!pendingDestructive) return
    const current = itemsWithCurrentEdits()

    if (pendingDestructive.type === 'empty') {
      replaceItemsMutation.mutate([])
      return
    }

    if (pendingDestructive.type === 'item') {
      const next = current.filter((_, index) => index !== pendingDestructive.index)
      replaceItemsMutation.mutate(next)
      return
    }

    if (pendingDestructive.type === 'group') {
      const groupName = pendingDestructive.groupName
      const next = current.filter(
        (item) => (item.nama_item?.trim() || 'Tanpa Kategori') !== groupName,
      )
      replaceItemsMutation.mutate(next)
    }
  }

  function prefillAddToGroup(groupName: string) {
    setProgressItemForm((current) => ({
      ...current,
      nama_item: groupName === 'Tanpa Kategori' ? '' : groupName,
    }))
    const formEl = document.getElementById('laporan-tambah-item-form')
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function prepareAutofillRencana(sourceItems?: ProgressItem[]) {
    const items =
      sourceItems && sourceItems.length > 0
        ? sourceItems
        : autofillSourceItems && autofillSourceItems.length > 0
          ? autofillSourceItems
          : progressItems
    if (items.length === 0) {
      onError?.('Belum ada item pekerjaan untuk di-autofill rencana.')
      return
    }

    const hasVolume = items.some((item) => Number(item.target_volume || 0) > 0)
    if (!hasVolume) {
      onError?.('Item belum punya target volume. Import Nego dulu atau isi target volume.')
      return
    }

    setAutofillSourceItems(items)
    setAutofillPreparing(true)
    try {
      let fromApi: MasterFasePekerjaan[] = []
      try {
        const raw = await getMasterFasePekerjaan({ activeOnly: true })
        fromApi = (raw as MasterFasePekerjaan[]).map((row) => ({
          id: Number(row.id),
          jenis_proyek: String(row.jenis_proyek ?? 'sanitasi'),
          kode_fase: String(row.kode_fase ?? ''),
          nama_fase: String(row.nama_fase ?? ''),
          prioritas: Number(row.prioritas ?? 0),
          overlap_persen: Number(row.overlap_persen ?? 0),
          durasi_faktor: Number(row.durasi_faktor ?? 1),
          keywords: row.keywords ?? null,
          deskripsi: row.deskripsi ?? null,
          is_active: row.is_active !== false,
        }))
      } catch {
        // fallback default fases
        fromApi = []
      }

      const plan = buildRencanaAutofillPlan(items, scheduleWeekCount, fromApi)
      if (plan.previewGroups.length === 0) {
        onError?.('Tidak ada jadwal yang bisa dibuat dari item saat ini.')
        return
      }
      setAutofillPlan(plan)
      setAutofillOpen(true)
    } catch (error) {
      onError?.(formatApiError(error, 'Gagal menyiapkan autofill rencana.'))
    } finally {
      setAutofillPreparing(false)
    }
  }

  function applyAutofillRencana() {
    if (!autofillPlan) return
    const baseItems =
      autofillSourceItems && autofillSourceItems.length > 0
        ? autofillSourceItems
        : progressItems
    const result = applyRencanaAutofillPlan(baseItems, autofillPlan)
    autofillRencanaMutation.mutate({
      items: result.items,
      weekCount: result.weekCount,
    })
  }

  function handleNegoImport(items: ProgressItem[], meta: NegoImportResult) {
    importNegoMutation.mutate(items, {
      onSuccess: () => {
        const totalLabel = Math.round(meta.grandTotal).toLocaleString('id-ID')
        const pdfPart =
          meta.pdfGrandTotal != null
            ? ` · PDF total Rp${Math.round(meta.pdfGrandTotal).toLocaleString('id-ID')}`
            : ''
        setImportFeedback(
          `Import Nego (${meta.source.toUpperCase()}): ${meta.itemCount} item · total +PPN ± Rp${totalLabel}${pdfPart}`,
        )
        setAutofillSourceItems(items)
        setOfferAutofill(true)
        window.setTimeout(() => setImportFeedback(null), 12000)
      },
    })
  }

  function getProgressCellValue(
    itemIndex: number,
    field: 'rencana' | 'realisasi',
    weekData?: { rencana?: number | null; realisasi?: number | null },
  ) {
    const edited = editedProgress[`${itemIndex}`]?.[field]
    if (edited !== undefined) return edited
    const val = weekData?.[field]
    if (val === undefined || val === null) return ''
    return String(val)
  }

  function setProgressCell(itemIndex: number, field: 'rencana' | 'realisasi', value: string) {
    setEditedProgress((prev) => ({
      ...prev,
      [`${itemIndex}`]: {
        ...prev[`${itemIndex}`],
        [field]: value,
      },
    }))
  }

  function handleProgressItemSubmit(event: FormEvent) {
    event.preventDefault()
    if (!progressItemForm.nama_item.trim()) {
      onError?.('Nama item wajib diisi.')
      return
    }
    if (!progressItemForm.satuan) {
      onError?.('Satuan wajib dipilih.')
      return
    }
    addProgressItemMutation.mutate(progressItemForm)
  }

  if (progressQuery.isPending) {
    return (
      <div className="detail-section-full detail-section-loading">
        <Spinner />
        <span>Memuat laporan mingguan...</span>
      </div>
    )
  }

  if (!progressView) {
    return (
      <EmptyState
        title="Laporan belum tersedia"
        description="Backend belum mengirim data progress untuk pekerjaan ini."
      />
    )
  }

  const deviasi =
    progressItems.reduce((acc, item) => {
      const bobot = Number(item.bobot || 0)
      const target = Number(item.target_volume || 0)
      if (target <= 0) return acc
      let itemPlan = 0
      let itemReal = 0
      Object.values(item.weekly_data || {}).forEach((data) => {
        itemPlan += Number(data.rencana || 0)
        itemReal += Number(data.realisasi || 0)
      })
      const planPercent = (itemPlan / target) * bobot
      const realPercent = (itemReal / target) * bobot
      return acc + (realPercent - planPercent)
    }, 0) ?? 0

  return (
    <div className="laporan-mingguan-form stack stack--compact">
      <div className="detail-kpi-row">
        <div className="detail-kpi-card detail-kpi-card--info">
          <div className="detail-kpi-label">Total bobot</div>
          <div className="detail-kpi-value">{formatPercent(progressView.totals?.total_bobot ?? 0)}</div>
          <div className="detail-kpi-hint">Akumulasi bobot item</div>
        </div>
        <div className={`detail-kpi-card detail-kpi-card--${deviasi >= 0 ? 'success' : 'danger'}`}>
          <div className="detail-kpi-label">Deviasi</div>
          <div className="detail-kpi-value">
            {deviasi > 0 ? '+' : ''}
            {formatPercent(deviasi)}
          </div>
          <div className="detail-kpi-hint">Selisih realisasi dengan rencana</div>
        </div>
        <div
          className={`detail-kpi-card detail-kpi-card--${progressTone(progressView.totals?.total_weighted_progress ?? 0)}`}
        >
          <div className="detail-kpi-label">Progress terhitung</div>
          <div className="detail-kpi-value">{formatPercent(progressView.totals?.total_weighted_progress ?? 0)}</div>
          <div className="detail-kpi-hint">Dari komposisi progress</div>
        </div>
        <div className="detail-kpi-card">
          <div className="detail-kpi-label">Minggu</div>
          <div className="detail-kpi-value">{maxWeek}</div>
          <div className="detail-kpi-hint">Batas waktu tersedia</div>
        </div>
      </div>

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Tambah item pekerjaan</h2>
            <p>
              {progressItems.length > 0
                ? 'Tambahkan item baru, atau import dari file Hasil Nego (Excel/PDF)'
                : 'Mulai dengan import Hasil Nego atau tambah item manual'}
            </p>
          </div>
          <div className="laporan-mingguan-header-actions">
            <Button
              type="button"
              variant="secondary"
              className="neo-button--sm"
              onClick={() => setImportNegoOpen(true)}
              disabled={importNegoMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              Import Nego
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="neo-button--sm"
              onClick={() => void prepareAutofillRencana()}
              disabled={
                autofillPreparing ||
                autofillRencanaMutation.isPending ||
                progressItems.length === 0
              }
              isLoading={autofillPreparing}
            >
              <Wand2 className="h-4 w-4" />
              Auto-Fill Rencana
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="neo-button--sm"
              onClick={() => setExportOpen(true)}
              disabled={progressItems.length === 0}
            >
              <FileDown className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {importFeedback || offerAutofill ? (
          <div className="import-nego-inline-feedback" role="status">
            {importFeedback ? <div>{importFeedback}</div> : null}
            {offerAutofill ? (
              <div className="import-nego-inline-feedback-actions">
                <span className="import-nego-offer-text">
                  Isi kolom Rencana per minggu secara otomatis berdasarkan fase?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void prepareAutofillRencana()}
                  isLoading={autofillPreparing}
                >
                  <Wand2 size={14} />
                  Isi rencana otomatis
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  onClick={() => setOfferAutofill(false)}
                >
                  Nanti saja
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <ImportNegoDialog
          open={importNegoOpen}
          onClose={() => setImportNegoOpen(false)}
          hasExistingItems={progressItems.some(
            (item) => Boolean(item.nama_item?.trim() || item.rincian_item?.trim()),
          )}
          onImport={handleNegoImport}
          onError={(message) => onError?.(message)}
        />

        <AutofillRencanaDialog
          open={autofillOpen}
          onClose={() => {
            setAutofillOpen(false)
            setAutofillPlan(null)
          }}
          plan={autofillPlan}
          applying={autofillRencanaMutation.isPending}
          onApply={applyAutofillRencana}
        />

        <ExportLaporanDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          progressView={progressView}
          items={progressItems.map((item, index) => {
            const edits = editedProgress[`${index}`]
            if (!edits) return item
            const weekKey = String(activeWeek)
            const weekData = { ...(item.weekly_data ?? {}) }
            const existing = weekData[weekKey] ?? {}
            weekData[weekKey] = {
              rencana:
                edits.rencana !== undefined
                  ? parseFloat(edits.rencana) || null
                  : (existing.rencana ?? null),
              realisasi:
                edits.realisasi !== undefined
                  ? parseFloat(edits.realisasi) || null
                  : (existing.realisasi ?? null),
            }
            return { ...item, weekly_data: weekData }
          })}
          weekCount={Math.max(maxWeek, scheduleWeekCount)}
          activeWeek={activeWeek}
          hasUnsavedEdits={Object.keys(editedProgress).length > 0}
          onError={(message) => onError?.(message)}
          onSuccess={(message) => {
            void trackPengawasEvent('laporan_export', {
              pekerjaan_id: pekerjaanId,
              week: activeWeek,
            })
            setImportFeedback(message)
            window.setTimeout(() => setImportFeedback(null), 6000)
          }}
        />

        <form
          id="laporan-tambah-item-form"
          className="neo-form"
          onSubmit={handleProgressItemSubmit}
        >
          <div className="neo-form-grid">
            <FieldGroup label="Grup / kategori">
              <Input
                value={progressItemForm.nama_item}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, nama_item: event.target.value }))
                }
                placeholder="Contoh: Pekerjaan persiapan"
                required
                list="laporan-group-suggestions"
              />
              <datalist id="laporan-group-suggestions">
                {groupedItems.map((group) => (
                  <option key={group.groupName} value={group.groupName} />
                ))}
              </datalist>
            </FieldGroup>
            <FieldGroup label="Rincian item">
              <Input
                value={progressItemForm.rincian_item}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, rincian_item: event.target.value }))
                }
                placeholder="Uraian rincian pekerjaan"
              />
            </FieldGroup>
            <FieldGroup label="Satuan">
              <select
                className="neo-input"
                value={progressItemForm.satuan}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, satuan: event.target.value }))
                }
                required
              >
                <option value="">Pilih satuan</option>
                {SATUAN_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Target volume">
              <Input
                type="number"
                step="any"
                value={progressItemForm.target_volume}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, target_volume: event.target.value }))
                }
                placeholder="0"
              />
            </FieldGroup>
            <FieldGroup label="Bobot (%)">
              <Input
                type="number"
                step="any"
                value={progressItemForm.bobot}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, bobot: event.target.value }))
                }
                placeholder="0"
              />
            </FieldGroup>
            <FieldGroup label="Harga satuan">
              <Input
                type="number"
                step="any"
                value={progressItemForm.harga_satuan}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, harga_satuan: event.target.value }))
                }
                placeholder="0"
              />
            </FieldGroup>
          </div>

          <div className="neo-form-actions">
            <Button type="submit" isLoading={addProgressItemMutation.isPending}>
              <Plus size={14} />
              <span>Tambah item</span>
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setProgressItemForm(EMPTY_PROGRESS_ITEM_FORM)}
            >
              Reset form
            </Button>
          </div>
        </form>
      </div>

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Rincian per minggu</h2>
            <p>
              Item dikelompokkan per kategori. Isi Rencana/Realisasi, atau hapus item / grup / kosongkan
              semua.
            </p>
          </div>
          <div className="detail-inline-controls laporan-mingguan-week-controls">
            <Label>Minggu aktif</Label>
            <select
              className="neo-input neo-input--week"
              value={activeWeek}
              onChange={(event) => {
                setActiveWeek(Number(event.target.value))
                setEditedProgress({})
              }}
            >
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  Minggu {week}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              isLoading={updateProgressMutation.isPending}
              disabled={Object.keys(editedProgress).length === 0}
              onClick={() => updateProgressMutation.mutate()}
            >
              <Save size={14} />
              <span>Simpan</span>
            </Button>
            {progressItems.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={replaceItemsMutation.isPending}
                onClick={() => setPendingDestructive({ type: 'empty' })}
              >
                <Eraser size={14} />
                <span>Kosongkan</span>
              </Button>
            ) : null}
            {progressSaved ? (
              <Badge tone="success">
                <Check size={12} /> Tersimpan
              </Badge>
            ) : null}
          </div>
        </div>

        {progressItems.length ? (
          <div className="table-wrap laporan-mingguan-table-wrap">
            <table className="neo-table laporan-mingguan-table laporan-mingguan-table--grouped">
              <thead>
                <tr>
                  <th className="col-action">Aksi</th>
                  <th>Item</th>
                  <th>Satuan</th>
                  <th>Target</th>
                  <th>Rencana</th>
                  <th>Realisasi</th>
                  <th>Status</th>
                </tr>
              </thead>
              {groupedItems.map((group, groupIndex) => (
                <tbody key={`group-${group.groupName}-${groupIndex}`} className="laporan-group-body">
                  <tr className="laporan-group-header-row">
                    <td colSpan={7} data-label="Grup">
                      <div className="laporan-group-header">
                        <div className="laporan-group-header-left">
                          <span className="laporan-group-index">{groupIndex + 1}</span>
                          <div>
                            <div className="laporan-group-title">{group.groupName}</div>
                            <div className="laporan-group-meta">
                              {group.items.length} rincian
                            </div>
                          </div>
                        </div>
                        <div className="laporan-group-header-actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => prefillAddToGroup(group.groupName)}
                          >
                            <Plus size={14} />
                            Tambah rincian
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={replaceItemsMutation.isPending}
                            onClick={() =>
                              setPendingDestructive({
                                type: 'group',
                                groupName: group.groupName,
                                count: group.items.length,
                              })
                            }
                            aria-label={`Hapus grup ${group.groupName}`}
                          >
                            <Trash2 size={14} />
                            Hapus grup
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {group.items.map(({ item, originalIndex }) => {
                    const weekData = item.weekly_data?.[String(activeWeek)]
                    const realisasiVal = getProgressCellValue(originalIndex, 'realisasi', weekData)
                    const realisasiNum = Number(realisasiVal || 0)
                    return (
                      <tr key={`progress-item-${originalIndex}`} className="laporan-group-item-row">
                        <td data-label="Aksi" className="col-action">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="laporan-item-delete"
                            disabled={replaceItemsMutation.isPending}
                            onClick={() =>
                              setPendingDestructive({
                                type: 'item',
                                index: originalIndex,
                                label:
                                  item.rincian_item?.trim() ||
                                  item.nama_item?.trim() ||
                                  `Item #${originalIndex + 1}`,
                              })
                            }
                            aria-label="Hapus item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                        <td data-label="Item">
                          <div className="table-title">
                            {item.rincian_item?.trim() || item.nama_item || '-'}
                          </div>
                          {item.rincian_item && item.nama_item ? (
                            <div className="table-subtitle">{item.nama_item}</div>
                          ) : null}
                          {item.bobot != null && String(item.bobot).trim() !== '' ? (
                            <div className="table-subtitle">Bobot {stringValue(item.bobot)}%</div>
                          ) : null}
                        </td>
                        <td data-label="Satuan">{item.satuan || '-'}</td>
                        <td data-label="Target">{stringValue(item.target_volume)}</td>
                        <td data-label="Rencana">
                          <input
                            type="number"
                            step="any"
                            className="neo-input neo-input--cell"
                            placeholder="0"
                            value={getProgressCellValue(originalIndex, 'rencana', weekData)}
                            onChange={(event) =>
                              setProgressCell(originalIndex, 'rencana', event.target.value)
                            }
                          />
                        </td>
                        <td data-label="Realisasi">
                          <input
                            type="number"
                            step="any"
                            className="neo-input neo-input--cell"
                            placeholder="0"
                            value={getProgressCellValue(originalIndex, 'realisasi', weekData)}
                            onChange={(event) =>
                              setProgressCell(originalIndex, 'realisasi', event.target.value)
                            }
                          />
                        </td>
                        <td data-label="Status">
                          <Badge tone={progressTone(realisasiNum) as 'danger' | 'warning' | 'success'}>
                            {realisasiNum > 0 ? formatPercent(realisasiNum) : 'Belum diisi'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
          </div>
        ) : (
          <EmptyState
            title="Belum ada item progress"
            description="Import Nego, atau tambah item manual. Item akan dikelompokkan per kategori."
          />
        )}
      </div>

      <ConfirmModal
        open={pendingDestructive != null}
        title={
          pendingDestructive?.type === 'empty'
            ? 'Kosongkan semua item?'
            : pendingDestructive?.type === 'group'
              ? 'Hapus grup pekerjaan?'
              : 'Hapus item?'
        }
        description={
          pendingDestructive?.type === 'empty'
            ? `Semua ${progressItems.length} item pekerjaan akan dihapus dari laporan. Tindakan ini bisa diganti dengan import ulang.`
            : pendingDestructive?.type === 'group'
              ? `Grup "${pendingDestructive.groupName}" beserta ${pendingDestructive.count} rincian akan dihapus.`
              : pendingDestructive?.type === 'item'
                ? `Item "${pendingDestructive.label}" akan dihapus dari laporan.`
                : undefined
        }
        confirmLabel={
          pendingDestructive?.type === 'empty'
            ? 'Ya, kosongkan'
            : pendingDestructive?.type === 'group'
              ? 'Ya, hapus grup'
              : 'Ya, hapus'
        }
        confirmTone="danger"
        isLoading={replaceItemsMutation.isPending}
        onConfirm={confirmDestructive}
        onCancel={() => setPendingDestructive(null)}
      />
    </div>
  )
}