import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ExternalLink, FileText, Send, Trash2, Upload, Wand2 } from 'lucide-react'
import {
  createKontrakAddendum,
  formatApiError,
  generateAddendumNumbers,
  getDocumentRegistersByAddendum,
  getKontrakAddendumRegisterGaps,
  getKontrakDetail,
  submitKontrakAddendum,
  deleteKontrakAddendum,
  updateKontrakAddendum,
  uploadKontrakAddendum,
} from '@/lib/api'
import {
  AddendumAttachmentInput,
  buildKontrakAddendumFormData,
  ADDENDUM_REGISTER_GAP_HEADLINE,
  getAddendumMissingAttachmentLabels,
  getRegisterGapStatusLines,
  isAddendumIncomplete,
  KONTRAK_ADDENDUM_ATTACHMENT_TYPES,
  KONTRAK_ADDENDUM_JENIS_OPTIONS,
} from '@/lib/kontrak-addendum'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type {
  DocumentRegister,
  KontrakAddendum,
  KontrakAddendumAttachmentType,
  KontrakAddendumJenis,
  KontrakAddendumPayload,
  KontrakAddendumRegisterGap,
  KontrakVersion,
} from '@/lib/types'
import {
  Badge,
  Button,
  DetailRow,
  EmptyState,
  FieldGroup,
  Input,
  Label,
  LoadingRow,
  StatusChip,
  Surface,
  Textarea,
} from '@/components/ui'

type KontrakAddendumTabProps = {
  pekerjaanId: number
  kontrakId?: number | null
}

function formatRupiah(value: number) {
  return value ? formatNumber(value) : ''
}

function parseRupiah(raw: string) {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

const statusTone: Record<string, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  utama: 'neutral',
  draft: 'neutral',
  diajukan: 'info',
  diproses: 'warning',
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
    alasan: 'Penambahan dan/atau pengurangan volume pekerjaan',
    deskripsi_perubahan:
      'Berdasarkan hasil perhitungan ulang volume pekerjaan di lapangan (Mutual Check/MC-0), ditemukan beberapa kondisi yang mengharuskan dilakukannya perubahan beberapa volume pekerjaan.',
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

const emptyAttachments = (): Partial<Record<KontrakAddendumAttachmentType, AddendumAttachmentInput>> => ({
  cco: { file: null, nomor: '', tanggal: '' },
  dokumen_nego_addendum: { file: null, nomor: '', tanggal: '' },
  surat_permohonan_pembahasan: { file: null, nomor: '', tanggal: '' },
  surat_undangan_pembahasan: { file: null, nomor: '', tanggal: '' },
  berita_acara_negosiasi_harga: { file: null, nomor: '', tanggal: '' },
  risalah_rapat_pembahasan: { file: null, nomor: '', tanggal: '' },
  berita_acara_penelitian: { file: null, nomor: '', tanggal: '' },
  ba_cco_addendum: { file: null, nomor: '', tanggal: '' },
  surat_perintah_pelaksanaan: { file: null, nomor: '', tanggal: '' },
})

export function KontrakAddendumTab({ pekerjaanId, kontrakId }: KontrakAddendumTabProps) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [form, setForm] = useState<KontrakAddendumPayload | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [attachments, setAttachments] = useState(emptyAttachments())
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([])
  const [generateError, setGenerateError] = useState<string | null>(null)

  const kontrakQuery = useQuery({
    queryKey: ['kontrak', 'detail', kontrakId],
    queryFn: () => getKontrakDetail(kontrakId as number),
    enabled: Number.isFinite(kontrakId) && (kontrakId ?? 0) > 0,
  })

  const registerGapsQuery = useQuery({
    queryKey: ['kontrak', 'addendum-register-gaps', kontrakId],
    queryFn: () => getKontrakAddendumRegisterGaps(kontrakId as number),
    enabled: Number.isFinite(kontrakId) && (kontrakId ?? 0) > 0,
  })

  const kontrak = kontrakQuery.data
  const registerGaps = registerGapsQuery.data?.items ?? []
  const addendums = kontrak?.addendums ?? []
  const versions = useMemo(() => (kontrak ? buildVersions(kontrak) : []), [kontrak])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kontrak', 'detail', kontrakId] })
    queryClient.invalidateQueries({ queryKey: ['kontrak', 'addendum-register-gaps', kontrakId] })
    queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!kontrak || !form) {
        throw new Error('Data kontrak belum siap.')
      }

      // Lampiran boleh belum lengkap — simpan draft dulu, lengkapi bertahap.
      // Wajib penuh baru saat submit (di-backend ensureRequiredAttachmentsExist).
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form || !editingId) {
        throw new Error('Data addendum belum siap.')
      }

      const { addendum_ke, tanggal_addendum, jenis_addendum, alasan, deskripsi_perubahan, nomor_addendum, nilai_kontrak_sebelum, nilai_kontrak_sesudah, tgl_selesai_sebelum, tgl_selesai_sesudah } = form
      return updateKontrakAddendum(editingId, {
        addendum_ke,
        tanggal_addendum,
        jenis_addendum,
        alasan,
        deskripsi_perubahan,
        nomor_addendum,
        nilai_kontrak_sebelum,
        nilai_kontrak_sesudah,
        tgl_selesai_sebelum,
        tgl_selesai_sesudah,
      })
    },
    onSuccess: () => {
      setActionMessage('Perbaikan addendum berhasil disimpan.')
      setFormError(null)
      setFormOpen(false)
      setEditingId(null)
      setAttachments(emptyAttachments())
      if (kontrak) setForm(buildDefaultForm(kontrak))
      invalidate()
    },
    onError: (error) => setFormError(formatApiError(error, 'Gagal menyimpan perbaikan addendum.')),
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

  const deleteMutation = useMutation({
    mutationFn: (addendumId: number) => deleteKontrakAddendum(addendumId),
    onSuccess: () => {
      setActionMessage('Addendum berhasil dihapus.')
      setFormError(null)
      invalidate()
    },
    onError: (error) => setFormError(formatApiError(error, 'Gagal menghapus addendum.')),
  })

  const processedAddendum = addendums.find((item) => item.status === 'diproses')

  const registersQuery = useQuery({
    queryKey: ['kontrak', 'addendum-registers', processedAddendum?.id],
    queryFn: () => getDocumentRegistersByAddendum(processedAddendum!.id),
    enabled: Boolean(processedAddendum?.id),
  })
  const docRegisters = registersQuery.data ?? []

  const uploadMutation = useMutation({
    mutationFn: ({ addendumId, type, file }: { addendumId: number; type: string; file: File }) =>
      uploadKontrakAddendum(addendumId, type, file),
    onSuccess: () => {
      setActionMessage('Dokumen berhasil diunggah.')
      invalidate()
      registersQuery.refetch()
    },
    onError: (error) => setFormError(formatApiError(error, 'Gagal mengunggah dokumen.')),
  })

  // Jumlah nomor = 1 nomor addendum + 8 lampiran wajib.
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!kontrak) throw new Error('Data kontrak belum siap.')
      const tanggal = form?.tanggal_addendum || new Date().toISOString().slice(0, 10)
      return generateAddendumNumbers(kontrak.id, {
        tanggal,
        count: 1 + Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES).length,
      })
    },
    onSuccess: (result) => {
      setGeneratedNumbers(result.numbers)
      setGenerateError(null)
      setActionMessage('Nomor berhasil di-generate. Lengkapi scan berkas lalu simpan draft.')
    },
    onError: (error) => setGenerateError(formatApiError(error, 'Gagal generate nomor.')),
  })

  // Isi otomatis nomor_addendum + field nomor tiap lampiran dari hasil generate.
  useEffect(() => {
    const nomorAddendum = generatedNumbers[0]
    if (!nomorAddendum) return
    setForm((current) =>
      current ? { ...current, nomor_addendum: nomorAddendum } : current,
    )
    const types = Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[]
    setAttachments((current) => {
      const next = { ...current }
      types.forEach((type, i) => {
        const num = generatedNumbers[i + 1]
        if (num) next[type] = { ...next[type]!, nomor: num }
      })
      return next
    })
  }, [generatedNumbers])

  const openForm = (gap?: KontrakAddendumRegisterGap) => {
    if (!kontrak) return
    const baseForm = buildDefaultForm(kontrak)

    setForm(
      gap
        ? {
            ...baseForm,
            nomor_addendum: gap.nomor_register,
            tanggal_addendum: gap.tanggal_register || baseForm.tanggal_addendum,
            // Prefill nilai dari register bila ada (rekomendasi #2).
            nilai_kontrak_sebelum: baseForm.nilai_kontrak_sebelum ?? 0,
            nilai_kontrak_sesudah: gap.nilai ?? baseForm.nilai_kontrak_sesudah ?? 0,
            alasan: gap.description
              ? `${gap.description} — Pelengkapan data addendum untuk register nomor ${gap.nomor_register}.`
              : `Pelengkapan data addendum untuk register nomor ${gap.nomor_register}.`,
            deskripsi_perubahan: `Nomor addendum ${gap.nomor_register} sudah terdaftar di Register Dokumen, namun belum tercatat di sistem. Mohon lengkapi pengajuan addendum dengan nomor yang sama.`,
          }
        : baseForm,
    )
    setAttachments(emptyAttachments())
    setGeneratedNumbers([])
    setGenerateError(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (addendum: KontrakAddendum) => {
    setEditingId(addendum.id)
    setForm({
      addendum_ke: addendum.addendum_ke,
      nomor_addendum: addendum.nomor_addendum ?? '',
      tanggal_addendum: addendum.tanggal_addendum,
      jenis_addendum: addendum.jenis_addendum,
      alasan: addendum.alasan ?? '',
      deskripsi_perubahan: addendum.deskripsi_perubahan ?? '',
      nilai_kontrak_sebelum: addendum.nilai_kontrak_sebelum ?? 0,
      nilai_kontrak_sesudah: addendum.nilai_kontrak_sesudah ?? 0,
      tgl_selesai_sebelum: addendum.tgl_selesai_sebelum ?? '',
      tgl_selesai_sesudah: addendum.tgl_selesai_sesudah ?? '',
    })
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
  const incompleteAddendums = addendums.filter(isAddendumIncomplete)
  const hasIncompleteItems = registerGaps.length > 0 || incompleteAddendums.length > 0

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

      {hasIncompleteItems ? (
        <Surface tone="warning" className="detail-section-full">
          <div className="detail-tab-header">
            <div className="detail-tab-header-left">
              <h2>
                <AlertTriangle size={16} /> Addendum perlu dilengkapi
              </h2>
              <p>
                Nomor register addendum sudah dibuat, tetapi detail pengajuan belum ada dan belum disetujui.
                Lengkapi data di bawah ini, atau selesaikan draft yang masih kurang lampiran.
              </p>
            </div>
          </div>

          <div className="stack stack--compact">
            {registerGaps.map((gap) => (
              <div key={gap.register_id} className="detail-output-card">
                <div className="detail-output-card-head">
                  <div>
                    <div className="output-title">Register sudah ada — {gap.nomor_register}</div>
                    <div className="output-meta">
                      {ADDENDUM_REGISTER_GAP_HEADLINE}
                    </div>
                  </div>
                  <Badge tone="warning">Belum disetujui</Badge>
                </div>
                <ul className="stack stack--compact hint-text">
                  {getRegisterGapStatusLines(gap).map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}:</strong> {item.value}
                      {item.done ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
                <p className="hint-text">
                  Register: {formatDate(gap.tanggal_register)}
                  {gap.type_name ? ` · ${gap.type_name}` : ''}
                </p>
                {gap.description ? (
                  <p className="hint-text">Keterangan: {gap.description}</p>
                ) : null}
                {gap.nilai != null ? (
                  <p className="hint-text">Nilai register: {formatCurrency(gap.nilai)}</p>
                ) : null}
                <div className="neo-form-actions">
                  <Button type="button" size="sm" onClick={() => openForm(gap)}>
                    Lengkapi detail addendum
                  </Button>
                </div>
              </div>
            ))}

            {incompleteAddendums.map((addendum) => {
              const missingLabels = getAddendumMissingAttachmentLabels(addendum)

              return (
                <div key={addendum.id} className="detail-output-card">
                  <div className="detail-output-card-head">
                    <div>
                      <div className="output-title">
                        Addendum ke-{addendum.addendum_ke}
                        {addendum.nomor_addendum ? ` — ${addendum.nomor_addendum}` : ''}
                      </div>
                      <div className="output-meta">
                        Status {addendum.status} · {formatDate(addendum.tanggal_addendum)}
                      </div>
                    </div>
                    <Badge tone="warning">Lampiran belum lengkap</Badge>
                  </div>
                  <p className="hint-text">Dokumen yang masih kurang: {missingLabels.join(', ')}</p>
                </div>
              )
            })}

            {processedAddendum && (
              <div className="detail-output-card">
                <div className="detail-output-card-head">
                  <div>
                    <div className="output-title">
                      Addendum ke-{processedAddendum.addendum_ke}
                      {processedAddendum.nomor_addendum ? ` — ${processedAddendum.nomor_addendum}` : ''}
                    </div>
                    <div className="output-meta">Diproses admin · unggah dokumen wajib berikut</div>
                  </div>
                  <Badge tone="warning">Di Proses</Badge>
                </div>
                <div className="stack stack--compact">
                  {docRegisters.length === 0 ? (
                    <p className="hint-text">Belum ada nomor dokumen dari admin.</p>
                  ) : (
                    docRegisters.map((register) => (
                      <div key={register.id} className="detail-inline-controls">
                        <div>
                          <div className="output-title">{register.description || register.type?.name || 'Dokumen'}</div>
                          <div className="output-meta">
                            Nomor: {register.nomor} · {formatDate(register.tanggal)}
                          </div>
                        </div>
                        <label className="neo-button neo-button--neutral neo-button--sm">
                          <Upload size={14} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file && register.attachment_type) {
                                uploadMutation.mutate({
                                  addendumId: processedAddendum.id,
                                  type: register.attachment_type,
                                  file,
                                })
                              }
                            }}
                          />
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </Surface>
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
                      <div className="detail-inline-controls">
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
                        {addendum?.status === 'ditolak' && (
                          <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={() => openEdit(addendum)}
                          >
                            <FileText size={14} />
                            Perbaiki
                          </Button>
                        )}
                        {addendum && addendum.status !== 'disetujui' && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            isLoading={deleteMutation.isPending && deleteMutation.variables === addendum.id}
                            onClick={() => {
                              if (window.confirm('Yakin ingin menghapus pengajuan addendum ini? Data lampiran dan draft akan hilang.')) {
                                deleteMutation.mutate(addendum.id)
                              }
                            }}
                          >
                            <Trash2 size={14} />
                            Hapus
                          </Button>
                        )}
                      </div>
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
            <h2>{editingId ? 'Perbaiki addendum' : 'Request addendum baru'}</h2>
            <p>
              {editingId
                ? 'Perbaiki data addendum yang ditolak, lalu ajukan kembali ke admin'
                : 'Buat draft pengajuan beserta 8 lampiran wajib, lalu ajukan ke admin'}
            </p>
          </div>
          <div className="detail-inline-controls">
            <button
              type="button"
              className="detail-penerima-form-toggle"
              aria-expanded={formOpen}
              onClick={() => (formOpen ? setFormOpen(false) : openForm(undefined))}
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
              if (editingId) {
                updateMutation.mutate()
              } else {
                createMutation.mutate()
              }
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
                  inputMode="numeric"
                  value={formatRupiah(form.nilai_kontrak_sebelum ?? 0)}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, nilai_kontrak_sebelum: parseRupiah(event.target.value) }
                        : current,
                    )
                  }
                />
              </FieldGroup>
              <FieldGroup label="Nilai sesudah">
                <Input
                  inputMode="numeric"
                  value={formatRupiah(form.nilai_kontrak_sesudah ?? 0)}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, nilai_kontrak_sesudah: parseRupiah(event.target.value) }
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
                  <Wand2 size={16} /> Generate nomor
                </h2>
                <p>
                  Nomor addendum dibuat otomatis dari sequence register dokumen (tipe ADD/Addendum).
                  Berkas lampiran menggunakan nomor addendum tersebut sebagai prefix.
                </p>
              </div>
            </div>

            <div className="neo-form-actions">
              <Button
                type="button"
                size="sm"
                isLoading={generateMutation.isPending}
                disabled={!form?.tanggal_addendum}
                onClick={() => generateMutation.mutate()}
              >
                <Wand2 size={14} />
                <span>Generate {1 + Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES).length} nomor</span>
              </Button>
              {!form?.tanggal_addendum && (
                <span className="hint-text">Isi tanggal addendum terlebih dahulu</span>
              )}
            </div>

            {generateError ? (
              <div className="form-error" role="alert">
                {generateError}
              </div>
            ) : null}

            {generatedNumbers.length > 0 ? (
              <ul className="stack stack--compact">
                <li className="hint-text">
                  <strong>Nomor addendum:</strong> {generatedNumbers[0]}
                </li>
                {(Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[]).map((type, i) => (
                  <li key={type} className="hint-text">
                    <strong>{KONTRAK_ADDENDUM_ATTACHMENT_TYPES[type]}:</strong> {generatedNumbers[i + 1]}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>
                  <FileText size={16} /> Lampiran wajib
                </h2>
                <p>Semua dokumen di bawah wajib diunggah saat membuat pengajuan addendum</p>
              </div>
            </div>

            <div className="stack stack--compact">
              {(Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[]).map((type) => (
                <div key={type} className="attach-row">
                  <div className="attach-row-head">
                    <Label className="field-group-label">{KONTRAK_ADDENDUM_ATTACHMENT_TYPES[type]}</Label>
                    {type === 'cco' ? <span className="hint-text">PDF, XLS, atau XLSX</span> : <span className="hint-text">PDF</span>}
                  </div>
                  <div className="attach-row-fields">
                    <Input
                      type="file"
                      accept={type === 'cco' ? '.pdf,.xls,.xlsx' : '.pdf'}
                      className="attach-file"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setAttachments((current) => ({ ...current, [type]: { ...current[type], file } }))
                      }}
                    />
                    <Input
                      placeholder="Nomor dokumen"
                      value={attachments[type]?.nomor ?? ''}
                      onChange={(event) =>
                        setAttachments((current) => ({ ...current, [type]: { ...current[type], nomor: event.target.value } }))
                      }
                    />
                    <Input
                      type="date"
                      value={attachments[type]?.tanggal ?? ''}
                      onChange={(event) =>
                        setAttachments((current) => ({ ...current, [type]: { ...current[type], tanggal: event.target.value } }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="neo-form-actions">
              <Button type="submit" isLoading={editingId ? updateMutation.isPending : createMutation.isPending}>
                {editingId ? 'Simpan perbaikan' : 'Simpan draft addendum'}
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