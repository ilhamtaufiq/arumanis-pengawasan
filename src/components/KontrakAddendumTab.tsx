import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ExternalLink, FileText, Send } from 'lucide-react'
import {
  createKontrakAddendum,
  formatApiError,
  getKontrakDetail,
  submitKontrakAddendum,
} from '@/lib/api'
import {
  buildKontrakAddendumFormData,
  getMissingAttachmentLabels,
  KONTRAK_ADDENDUM_ATTACHMENT_TYPES,
  KONTRAK_ADDENDUM_JENIS_OPTIONS,
} from '@/lib/kontrak-addendum'
import { formatCurrency, formatDate } from '@/lib/format'
import type {
  KontrakAddendum,
  KontrakAddendumAttachmentType,
  KontrakAddendumJenis,
  KontrakAddendumPayload,
  KontrakVersion,
} from '@/lib/types'
import {
  Badge,
  Button,
  DetailRow,
  EmptyState,
  FieldGroup,
  Input,
  LoadingRow,
  StatusChip,
  Textarea,
} from '@/components/ui'

type KontrakAddendumTabProps = {
  pekerjaanId: number
  kontrakId?: number | null
}

const statusTone: Record<string, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  utama: 'neutral',
  draft: 'neutral',
  diajukan: 'info',
  disetujui: 'success',
  ditolak: 'danger',
}

function canSubmitAddendum(addendum: KontrakAddendum) {
  return addendum.can_submit ?? ['draft', 'ditolak'].includes(addendum.status)
}

function buildDefaultForm(kontrak: {
  nilai_kontrak?: number | null
  nilai_kontrak_berjalan?: number | null
  tgl_selesai?: string | null
  tgl_selesai_berjalan?: string | null
  addendums?: KontrakAddendum[]
}): KontrakAddendumPayload {
  const addendums = kontrak.addendums ?? []
  const latestApproved = [...addendums]
    .filter((item) => item.status === 'disetujui')
    .sort((a, b) => b.addendum_ke - a.addendum_ke)[0]

  const nextAddendumKe = (addendums.reduce((max, item) => Math.max(max, item.addendum_ke), 0) || 0) + 1
  const defaultNilai = latestApproved?.nilai_kontrak_sesudah ?? kontrak.nilai_kontrak_berjalan ?? kontrak.nilai_kontrak ?? 0
  const defaultTglSelesai = latestApproved?.tgl_selesai_sesudah ?? kontrak.tgl_selesai_berjalan ?? kontrak.tgl_selesai ?? ''

  return {
    addendum_ke: nextAddendumKe,
    tanggal_addendum: new Date().toISOString().slice(0, 10),
    jenis_addendum: 'lainnya',
    alasan: '',
    deskripsi_perubahan: '',
    nilai_kontrak_sebelum: defaultNilai,
    nilai_kontrak_sesudah: defaultNilai,
    tgl_selesai_sebelum: defaultTglSelesai,
    tgl_selesai_sesudah: defaultTglSelesai,
  }
}

function buildVersions(kontrak: {
  spk?: string | null
  kode_paket?: string | null
  tgl_spk?: string | null
  nilai_kontrak?: number | null
  tgl_selesai?: string | null
  contract_versions?: KontrakVersion[]
  addendums?: KontrakAddendum[]
}) {
  if (kontrak.contract_versions?.length) {
    return kontrak.contract_versions
  }

  const addendums = kontrak.addendums ?? []

  return [
    {
      type: 'utama' as const,
      label: 'Kontrak Utama',
      nomor: kontrak.spk || kontrak.kode_paket,
      tanggal: kontrak.tgl_spk,
      nilai_kontrak: kontrak.nilai_kontrak,
      tgl_selesai: kontrak.tgl_selesai,
      status: 'utama',
    },
    ...addendums.map((item) => ({
      type: 'addendum' as const,
      id: item.id,
      label: `Addendum ke-${item.addendum_ke}`,
      addendum_ke: item.addendum_ke,
      nomor: item.nomor_addendum,
      tanggal: item.tanggal_addendum,
      nilai_kontrak: item.nilai_kontrak_sesudah,
      tgl_selesai: item.tgl_selesai_sesudah,
      status: item.status,
    })),
  ]
}

const emptyAttachments = (): Partial<Record<KontrakAddendumAttachmentType, File | null>> => ({
  surat_permohonan: null,
  surat_undangan_pembahasan: null,
  risalah_rapat_pembahasan: null,
  surat_perintah_pelaksanaan_kerja_sesuai_addendum: null,
  cco: null,
  laporan_pekerjaan: null,
  berita_acara: null,
  sk_peneliti_kontrak: null,
})

export function KontrakAddendumTab({ pekerjaanId, kontrakId }: KontrakAddendumTabProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [form, setForm] = useState<KontrakAddendumPayload | null>(null)
  const [attachments, setAttachments] = useState(emptyAttachments())

  const kontrakQuery = useQuery({
    queryKey: ['kontrak', 'detail', kontrakId],
    queryFn: () => getKontrakDetail(kontrakId as number),
    enabled: Number.isFinite(kontrakId) && (kontrakId ?? 0) > 0,
  })

  const kontrak = kontrakQuery.data
  const addendums = kontrak?.addendums ?? []
  const versions = useMemo(() => (kontrak ? buildVersions(kontrak) : []), [kontrak])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kontrak', 'detail', kontrakId] })
    queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!kontrak || !form) {
        throw new Error('Data kontrak belum siap.')
      }

      const missing = getMissingAttachmentLabels(attachments)
      if (missing.length > 0) {
        throw new Error(`Lampiran wajib belum lengkap: ${missing.join(', ')}`)
      }

      const formData = buildKontrakAddendumFormData(form, attachments)
      return createKontrakAddendum(kontrak.id, formData)
    },
    onSuccess: () => {
      setActionMessage('Pengajuan addendum berhasil disimpan sebagai draft.')
      setFormError(null)
      setFormOpen(false)
      setAttachments(emptyAttachments())
      if (kontrak) setForm(buildDefaultForm(kontrak))
      invalidate()
    },
    onError: (error) => setFormError(formatApiError(error, 'Gagal menyimpan pengajuan addendum.')),
  })

  const submitMutation = useMutation({
    mutationFn: (addendumId: number) => submitKontrakAddendum(addendumId),
    onSuccess: () => {
      setActionMessage('Addendum berhasil diajukan ke admin.')
      setFormError(null)
      invalidate()
    },
    onError: (error) => setFormError(formatApiError(error, 'Gagal mengajukan addendum.')),
  })

  const openForm = () => {
    if (!kontrak) return
    setForm(buildDefaultForm(kontrak))
    setAttachments(emptyAttachments())
    setFormError(null)
    setFormOpen(true)
  }

  if (!kontrakId) {
    return (
      <EmptyState
        title="Belum ada kontrak"
        description="Pekerjaan ini belum memiliki data kontrak. Hubungi admin untuk mendaftarkan kontrak terlebih dahulu."
      />
    )
  }

  if (kontrakQuery.isLoading) {
    return <LoadingRow>Memuat data kontrak dan addendum...</LoadingRow>
  }

  if (kontrakQuery.isError || !kontrak) {
    return (
      <EmptyState
        title="Gagal memuat kontrak"
        description={formatApiError(kontrakQuery.error, 'Data kontrak tidak dapat diambil.')}
      />
    )
  }

  const draftCount = addendums.filter((item) => item.status === 'draft').length
  const submittedCount = addendums.filter((item) => item.status === 'diajukan').length

  return (
    <div className="stack stack--compact">
      <div className="detail-status-bar">
        <StatusChip>
          Versi: <strong>{formatDate(kontrak.tgl_spk)}</strong>
        </StatusChip>
        <StatusChip>
          Nilai berjalan: <strong>{formatCurrency(kontrak.nilai_kontrak_berjalan ?? kontrak.nilai_kontrak)}</strong>
        </StatusChip>
        <StatusChip>
          Draft: <strong>{draftCount}</strong>
        </StatusChip>
        <StatusChip>
          Diajukan: <strong>{submittedCount}</strong>
        </StatusChip>
      </div>

      {actionMessage ? (
        <p className="hint-text" role="status">
          {actionMessage}
        </p>
      ) : null}

      {formError ? (
        <div className="form-error" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Ringkasan kontrak</h2>
            <p>Baseline kontrak dan nilai berjalan setelah addendum disetujui</p>
          </div>
        </div>

        <div className="detail-grid detail-grid--auto">
          <DetailRow label="SPK / Paket" value={kontrak.spk || kontrak.kode_paket || '-'} />
          <DetailRow label="Penyedia" value={kontrak.penyedia?.nama || '-'} />
          <DetailRow label="Nilai kontrak awal" value={formatCurrency(kontrak.nilai_kontrak)} />
          <DetailRow
            label="Nilai kontrak berjalan"
            value={formatCurrency(kontrak.nilai_kontrak_berjalan ?? kontrak.nilai_kontrak)}
          />
          <DetailRow label="Tgl. selesai awal" value={formatDate(kontrak.tgl_selesai)} />
          <DetailRow
            label="Tgl. selesai berjalan"
            value={formatDate(kontrak.tgl_selesai_berjalan ?? kontrak.tgl_selesai)}
          />
        </div>
      </div>

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Versi kontrak & addendum</h2>
            <p>Histori kontrak utama dan seluruh pengajuan addendum</p>
          </div>
        </div>

        <table className="neo-table">
            <thead>
              <tr>
                <th>Versi</th>
                <th>Nomor</th>
                <th>Tanggal</th>
                <th>Nilai</th>
                <th>Tgl. selesai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => {
                const addendum =
                  version.type === 'addendum' && version.id
                    ? addendums.find((item) => item.id === version.id)
                    : undefined

                const versionKey =
                  version.type === 'addendum' && 'id' in version && version.id
                    ? `addendum-${version.id}`
                    : 'utama'

                return (
                  <tr key={versionKey}>
                    <td>{version.label}</td>
                    <td>{version.nomor || '-'}</td>
                    <td>{formatDate(version.tanggal)}</td>
                    <td>{formatCurrency(version.nilai_kontrak)}</td>
                    <td>{formatDate(version.tgl_selesai)}</td>
                    <td>
                      <Badge tone={statusTone[version.status] || 'neutral'}>{version.status}</Badge>
                    </td>
                    <td>
                      {addendum && canSubmitAddendum(addendum) ? (
                        <Button
                          type="button"
                          variant="neutral"
                          size="sm"
                          isLoading={submitMutation.isPending && submitMutation.variables === addendum.id}
                          onClick={() => submitMutation.mutate(addendum.id)}
                        >
                          <Send size={14} />
                          Ajukan
                        </Button>
                      ) : addendum?.attachments?.length ? (
                        <span className="hint-text">{addendum.attachments.length} lampiran</span>
                      ) : (
                        <span className="hint-text">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
      </div>

      {addendums.length ? (
        <div className="detail-section-full">
          <div className="detail-tab-header">
            <div className="detail-tab-header-left">
              <h2>Detail pengajuan</h2>
              <p>Ringkasan alasan, perubahan nilai, dan lampiran dokumen</p>
            </div>
          </div>

          <div className="stack stack--compact">
            {addendums.map((addendum) => (
              <div key={addendum.id} className="detail-output-card">
                <div className="detail-output-card-head">
                  <div>
                    <div className="output-title">
                      Addendum ke-{addendum.addendum_ke}
                      {addendum.nomor_addendum ? ` — ${addendum.nomor_addendum}` : ''}
                    </div>
                    <div className="output-meta">
                      {KONTRAK_ADDENDUM_JENIS_OPTIONS.find((item) => item.value === addendum.jenis_addendum)?.label || addendum.jenis_addendum}
                      {' · '}
                      {formatDate(addendum.tanggal_addendum)}
                    </div>
                  </div>
                  <Badge tone={statusTone[addendum.status] || 'neutral'}>{addendum.status}</Badge>
                </div>

                {addendum.alasan ? <p className="hint-text">{addendum.alasan}</p> : null}
                {addendum.deskripsi_perubahan ? <p className="hint-text">{addendum.deskripsi_perubahan}</p> : null}

                <div className="badge-row-inline">
                  <Badge tone="neutral">
                    Nilai: {formatCurrency(addendum.nilai_kontrak_sebelum)} → {formatCurrency(addendum.nilai_kontrak_sesudah)}
                  </Badge>
                  <Badge tone="neutral">
                    Selesai: {formatDate(addendum.tgl_selesai_sebelum)} → {formatDate(addendum.tgl_selesai_sesudah)}
                  </Badge>
                </div>

                {addendum.attachments?.length ? (
                  <div className="badge-row-inline">
                    {addendum.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="neo-chip"
                      >
                        <ExternalLink size={12} />
                        <span>{attachment.label || attachment.name}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="detail-section-full">
        <div className="detail-tab-header">
          <div className="detail-tab-header-left">
            <h2>Request addendum baru</h2>
            <p>Buat draft pengajuan beserta 8 lampiran wajib, lalu ajukan ke admin</p>
          </div>
          <div className="detail-inline-controls">
            <button
              type="button"
              className="detail-penerima-form-toggle"
              aria-expanded={formOpen}
              onClick={() => (formOpen ? setFormOpen(false) : openForm())}
            >
              <ChevronDown size={16} />
              <span>{formOpen ? 'Tutup form' : 'Buka form'}</span>
            </button>
          </div>
        </div>

        {formOpen && form ? (
          <form
            className="neo-form"
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
          >
            <div className="neo-form-grid">
              <FieldGroup label="Addendum ke">
                <Input
                  type="number"
                  min={1}
                  value={form.addendum_ke}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, addendum_ke: Number(event.target.value) } : current,
                    )
                  }
                />
              </FieldGroup>
              <FieldGroup label="Tanggal addendum">
                <Input
                  type="date"
                  value={form.tanggal_addendum}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, tanggal_addendum: event.target.value } : current,
                    )
                  }
                  required
                />
              </FieldGroup>
              <FieldGroup label="Jenis addendum">
                <select
                  className="neo-input"
                  value={form.jenis_addendum}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, jenis_addendum: event.target.value as KontrakAddendumJenis }
                        : current,
                    )
                  }
                >
                  {KONTRAK_ADDENDUM_JENIS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="Nilai sebelum">
                <Input
                  type="number"
                  min={0}
                  value={form.nilai_kontrak_sebelum ?? ''}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, nilai_kontrak_sebelum: Number(event.target.value) || 0 }
                        : current,
                    )
                  }
                />
              </FieldGroup>
              <FieldGroup label="Nilai sesudah">
                <Input
                  type="number"
                  min={0}
                  value={form.nilai_kontrak_sesudah ?? ''}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, nilai_kontrak_sesudah: Number(event.target.value) || 0 }
                        : current,
                    )
                  }
                />
              </FieldGroup>
              <FieldGroup label="Tgl. selesai sebelum">
                <Input
                  type="date"
                  value={form.tgl_selesai_sebelum || ''}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, tgl_selesai_sebelum: event.target.value } : current,
                    )
                  }
                />
              </FieldGroup>
              <FieldGroup label="Tgl. selesai sesudah">
                <Input
                  type="date"
                  value={form.tgl_selesai_sesudah || ''}
                  onChange={(event) =>
                    setForm((current) =>
                      current ? { ...current, tgl_selesai_sesudah: event.target.value } : current,
                    )
                  }
                />
              </FieldGroup>
            </div>

            <FieldGroup label="Alasan">
              <Textarea
                rows={3}
                value={form.alasan || ''}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, alasan: event.target.value } : current))
                }
                placeholder="Jelaskan alasan pengajuan addendum"
              />
            </FieldGroup>

            <FieldGroup label="Deskripsi perubahan">
              <Textarea
                rows={3}
                value={form.deskripsi_perubahan || ''}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, deskripsi_perubahan: event.target.value } : current,
                  )
                }
                placeholder="Rincikan perubahan teknis, biaya, atau waktu"
              />
            </FieldGroup>

            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>
                  <FileText size={16} /> Lampiran wajib
                </h2>
                <p>Semua dokumen di bawah wajib diunggah saat membuat pengajuan addendum</p>
              </div>
            </div>

            <div className="neo-form-grid">
              {(Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[]).map((type) => (
                <FieldGroup
                  key={type}
                  label={KONTRAK_ADDENDUM_ATTACHMENT_TYPES[type]}
                  hint={type === 'cco' ? 'PDF, XLS, atau XLSX' : 'PDF'}
                >
                  <Input
                    type="file"
                    accept={type === 'cco' ? '.pdf,.xls,.xlsx' : '.pdf'}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setAttachments((current) => ({ ...current, [type]: file }))
                    }}
                  />
                </FieldGroup>
              ))}
            </div>

            <div className="neo-form-actions">
              <Button type="submit" isLoading={createMutation.isPending}>
                Simpan draft addendum
              </Button>
              <Button type="button" variant="neutral" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
            </div>
          </form>
        ) : (
          <p className="hint-text">
            Buka form untuk membuat pengajuan addendum baru. Setelah draft tersimpan, gunakan tombol Ajukan pada tabel versi.
          </p>
        )}
      </div>
    </div>
  )
}