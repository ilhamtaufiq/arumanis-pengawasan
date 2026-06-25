import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Save } from 'lucide-react'
import { formatApiError, getProgressReport, updateProgress } from '@/lib/api'
import { formatPercent, progressTone } from '@/lib/format'
import type { ProgressItem, ProgressReportView } from '@/lib/types'
import { Badge, Button, EmptyState, FieldGroup, Input, Label, Spinner } from '@/components/ui'

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

  const progressQuery = useQuery({
    queryKey: ['pekerjaan', 'progress', pekerjaanId],
    queryFn: () => getProgressReport(pekerjaanId),
    enabled: pekerjaanId > 0,
  })

  const progressView = progressQuery.data as ProgressReportView | undefined
  const progressItems = progressView?.items ?? []
  const maxWeek = Math.max(1, Number(progressView?.max_minggu ?? 1))
  const weekOptions = Array.from({ length: maxWeek }, (_, index) => index + 1)

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
                ? 'Tambahkan item baru ke daftar laporan'
                : 'Mulai dengan menambahkan item pekerjaan pertama'}
            </p>
          </div>
        </div>

        <form className="neo-form" onSubmit={handleProgressItemSubmit}>
          <div className="neo-form-grid">
            <FieldGroup label="Nama item">
              <Input
                value={progressItemForm.nama_item}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, nama_item: event.target.value }))
                }
                placeholder="Contoh: Pekerjaan persiapan"
                required
              />
            </FieldGroup>
            <FieldGroup label="Rincian item">
              <Input
                value={progressItemForm.rincian_item}
                onChange={(event) =>
                  setProgressItemForm((current) => ({ ...current, rincian_item: event.target.value }))
                }
                placeholder="Detail pekerjaan (opsional)"
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
            <p>Isi kolom Rencana dan Realisasi lalu simpan</p>
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
            {progressSaved ? (
              <Badge tone="success">
                <Check size={12} /> Tersimpan
              </Badge>
            ) : null}
          </div>
        </div>

        {progressItems.length ? (
          <div className="table-wrap laporan-mingguan-table-wrap">
            <table className="neo-table laporan-mingguan-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Satuan</th>
                  <th>Target</th>
                  <th>Rencana</th>
                  <th>Realisasi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {progressItems.map((item, itemIndex) => {
                  const weekData = item.weekly_data?.[String(activeWeek)]
                  const realisasiVal = getProgressCellValue(itemIndex, 'realisasi', weekData)
                  const realisasiNum = Number(realisasiVal || 0)
                  return (
                    <tr key={`progress-item-${itemIndex}`}>
                      <td data-label="Item">
                        <div className="table-title">{item.nama_item || item.rincian_item || '-'}</div>
                        {item.rincian_item ? <div className="table-subtitle">{item.rincian_item}</div> : null}
                      </td>
                      <td data-label="Satuan">{item.satuan || '-'}</td>
                      <td data-label="Target">{stringValue(item.target_volume)}</td>
                      <td data-label="Rencana">
                        <input
                          type="number"
                          step="any"
                          className="neo-input neo-input--cell"
                          placeholder="0"
                          value={getProgressCellValue(itemIndex, 'rencana', weekData)}
                          onChange={(event) => setProgressCell(itemIndex, 'rencana', event.target.value)}
                        />
                      </td>
                      <td data-label="Realisasi">
                        <input
                          type="number"
                          step="any"
                          className="neo-input neo-input--cell"
                          placeholder="0"
                          value={getProgressCellValue(itemIndex, 'realisasi', weekData)}
                          onChange={(event) => setProgressCell(itemIndex, 'realisasi', event.target.value)}
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
            </table>
          </div>
        ) : (
          <EmptyState
            title="Belum ada item progress"
            description="Gunakan form di atas untuk menambahkan item pekerjaan pertama."
          />
        )}
      </div>
    </div>
  )
}