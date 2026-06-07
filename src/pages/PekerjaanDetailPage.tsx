import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, Camera, Edit3, FileText, MessageSquareText, RefreshCcw, Shield, Trash2, Upload, X } from 'lucide-react'
import {
  createFoto,
  createPenerima,
  deleteFoto,
  deletePenerima,
  getPekerjaanDetail,
  getProgressReport,
  getTiketList,
  updatePenerima,
} from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, progressTone } from '@/lib/format'
import {
  AnchorButton,
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  Input,
  Label,
  MetricCard,
  SectionHeader,
  Spinner,
  Surface,
  Textarea,
} from '@/components/ui'
import type { Foto, Output, PekerjaanDetail, Penerima, ProgressItem, ProgressReportView, Tiket } from '@/lib/types'

type DetailTab = 'ringkasan' | 'penerima' | 'foto' | 'progress' | 'tiket'

type PenerimaFormState = {
  nama: string
  jumlah_jiwa: string
  nik: string
  alamat: string
  is_komunal: boolean
}

type UploadTarget = {
  output: Output
  slot: string
}

type MetricTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info'

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: ReactNode }> = [
  { id: 'ringkasan', label: 'Ringkasan', icon: <Shield size={16} /> },
  { id: 'penerima', label: 'Penerima', icon: <FileText size={16} /> },
  { id: 'foto', label: 'Foto', icon: <Camera size={16} /> },
  { id: 'progress', label: 'Progress', icon: <RefreshCcw size={16} /> },
  { id: 'tiket', label: 'Tiket', icon: <MessageSquareText size={16} /> },
]

const FOTO_SLOTS = ['0%', '25%', '50%', '75%', '100%'] as const

const EMPTY_PENERIMA_FORM: PenerimaFormState = {
  nama: '',
  jumlah_jiwa: '',
  nik: '',
  alamat: '',
  is_komunal: false,
}

export function PekerjaanDetailPage() {
  const { pekerjaanId: rawPekerjaanId } = useParams()
  const pekerjaanId = Number(rawPekerjaanId)
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<DetailTab>('ringkasan')
  const [activeWeek, setActiveWeek] = useState(1)
  const [previewFoto, setPreviewFoto] = useState<Foto | null>(null)
  const [deleteFotoTarget, setDeleteFotoTarget] = useState<Foto | null>(null)
  const [deletePenerimaTarget, setDeletePenerimaTarget] = useState<Penerima | null>(null)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [editingPenerimaId, setEditingPenerimaId] = useState<number | null>(null)
  const [penerimaForm, setPenerimaForm] = useState<PenerimaFormState>(EMPTY_PENERIMA_FORM)

  const pekerjaanQuery = useQuery({
    queryKey: ['pekerjaan', 'detail', pekerjaanId],
    queryFn: () => getPekerjaanDetail(pekerjaanId),
    enabled: Number.isFinite(pekerjaanId),
  })

  const progressQuery = useQuery({
    queryKey: ['pekerjaan', 'progress', pekerjaanId],
    queryFn: () => getProgressReport(pekerjaanId),
    enabled: Number.isFinite(pekerjaanId),
  })

  const tiketQuery = useQuery({
    queryKey: ['tiket', 'list', { pekerjaanId }],
    queryFn: () => getTiketList({ pekerjaan_id: pekerjaanId, per_page: 15 }),
    enabled: Number.isFinite(pekerjaanId),
  })

  const pekerjaan = pekerjaanQuery.data as PekerjaanDetail | undefined
  const progressView = progressQuery.data as ProgressReportView | undefined
  const fotoList = pekerjaan?.foto ?? []
  const penerimaList = pekerjaan?.penerima ?? []
  const outputList = pekerjaan?.output ?? []
  const tiketList = tiketQuery.data?.data ?? []
  const totalFoto = fotoList.length
  const totalPenerima = penerimaList.length
  const progressValue = Number(progressView?.totals?.total_weighted_progress ?? pekerjaan?.progress_total ?? 0)
  const statusFoto = resolveFotoStatus(pekerjaan)
  const maxWeek = Math.max(1, Number(progressView?.max_minggu ?? 1))

  const kegiatanLabel = pickFirstText([
    pekerjaan?.kegiatan?.nama_sub_kegiatan,
    pekerjaan?.kegiatan?.nama_kegiatan,
    recordText(pekerjaan?.kegiatan, 'nama_program'),
    progressView?.kegiatan?.nama_sub_kegiatan,
    progressView?.kegiatan?.nama_kegiatan,
  ])
  const tahunLabel = pickFirstText([
    stringValue(pekerjaan?.kegiatan?.tahun_anggaran),
    stringValue(progressView?.kegiatan?.tahun_anggaran),
    recordText(pekerjaan?.kegiatan, 'tahun_anggaran'),
    recordText(progressView?.kegiatan, 'tahun_anggaran'),
  ])
  const lokasiLabel = pickFirstText([
    pekerjaan?.kecamatan?.nama_kecamatan,
    pekerjaan?.desa?.nama_desa,
    progressView?.pekerjaan?.lokasi,
    progressView?.pekerjaan?.kecamatan_nama,
    progressView?.pekerjaan?.desa_nama,
  ])
  const pengawasLabel = pickFirstText([
    pekerjaan?.pengawas?.nama,
    recordText(pekerjaan, 'pengawas_nama'),
    recordText(progressView?.pekerjaan, 'pengawas_nama'),
  ])
  const pendampingLabel = pickFirstText([
    pekerjaan?.pendamping?.nama,
    recordText(pekerjaan, 'pendamping_nama'),
    recordText(progressView?.pekerjaan, 'pendamping_nama'),
  ])
  const sourceBadges = normalizeArray(pekerjaan?.assignment_sources)

  useEffect(() => {
    if (activeWeek > maxWeek) {
      setActiveWeek(maxWeek)
    }
  }, [activeWeek, maxWeek])

  useEffect(() => {
    if (penerimaForm.is_komunal) {
      setPenerimaForm((current) => ({
        ...current,
        jumlah_jiwa: '',
        nik: '',
      }))
    }
  }, [penerimaForm.is_komunal])

  const outputPhotoMatrix = useMemo(() => {
    return outputList.map((output) => {
      const slots = FOTO_SLOTS.map((slot) => {
        const foto = fotoList.find(
          (item) => item.komponen_id === output.id && normalizeSlotLabel(item.keterangan) === slot,
        )
        return { slot, foto }
      })

      return {
        output,
        slots,
        count: fotoList.filter((item) => item.komponen_id === output.id).length,
      }
    })
  }, [fotoList, outputList])

  function resetPenerimaForm() {
    setEditingPenerimaId(null)
    setPenerimaForm(EMPTY_PENERIMA_FORM)
  }

  function handleEditPenerima(penerima: Penerima) {
    setEditingPenerimaId(penerima.id)
    setPenerimaForm({
      nama: penerima.nama || '',
      jumlah_jiwa: stringValue(penerima.jumlah_jiwa),
      nik: penerima.nik || '',
      alamat: penerima.alamat || '',
      is_komunal: Boolean(penerima.is_komunal),
    })
    setActiveTab('penerima')
  }

  function openUploadTarget(output: Output, slot: string) {
    setUploadTarget({ output, slot })
    setUploadFile(null)
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  function handlePenerimaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nama = penerimaForm.nama.trim()
    if (!nama) return

    const payload: PenerimaPayload = {
      pekerjaan_id: pekerjaanId,
      nama,
      is_komunal: penerimaForm.is_komunal,
    }

    const alamat = penerimaForm.alamat.trim()
    if (alamat) {
      payload.alamat = alamat
    }

    if (!penerimaForm.is_komunal) {
      const jumlahJiwa = normalizeOptionalNumber(penerimaForm.jumlah_jiwa)
      if (jumlahJiwa !== undefined) {
        payload.jumlah_jiwa = jumlahJiwa
      }

      const nik = penerimaForm.nik.trim()
      if (nik) {
        payload.nik = nik
      }
    }

    if (editingPenerimaId) {
      updatePenerimaMutation.mutate({ id: editingPenerimaId, input: payload })
    } else {
      createPenerimaMutation.mutate(payload)
    }
  }

  const createPenerimaMutation = useMutation({
    mutationFn: (input: PenerimaPayload) => createPenerima(input),
    onSuccess: async () => {
      resetPenerimaForm()
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const updatePenerimaMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: PenerimaPayload }) => updatePenerima(id, input),
    onSuccess: async () => {
      resetPenerimaForm()
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const deletePenerimaMutation = useMutation({
    mutationFn: (penerimaId: number) => deletePenerima(penerimaId),
    onSuccess: async () => {
      setDeletePenerimaTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const uploadFotoMutation = useMutation({
    mutationFn: async (input: { file: File; output: Output; slot: string }) => {
      const formData = new FormData()
      formData.append('pekerjaan_id', String(pekerjaanId))
      formData.append('komponen_id', String(input.output.id))
      formData.append('keterangan', input.slot)
      formData.append('koordinat', 'manual')
      formData.append('image', input.file)
      return createFoto(formData)
    },
    onSuccess: async () => {
      setUploadTarget(null)
      setUploadFile(null)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const deleteFotoMutation = useMutation({
    mutationFn: (fotoId: number) => deleteFoto(fotoId),
    onSuccess: async () => {
      setDeleteFotoTarget(null)
      setPreviewFoto(null)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  if (!Number.isFinite(pekerjaanId)) {
    return (
      <EmptyState
        title="Pekerjaan tidak valid"
        description="ID pekerjaan pada URL tidak bisa dibaca."
        action={<AnchorButton variant="neutral" to="/pekerjaan">Kembali ke daftar</AnchorButton>}
      />
    )
  }

  if (pekerjaanQuery.isPending) {
    return (
      <div className="auth-page">
        <Surface className="auth-card auth-card--loading">
          <Spinner />
          <div>Memuat detail pekerjaan...</div>
        </Surface>
      </div>
    )
  }

  if (pekerjaanQuery.isError || !pekerjaan) {
    return (
      <EmptyState
        title="Gagal memuat data"
        description="Detail pekerjaan tidak tersedia atau terjadi kesalahan saat mengambil data dari server."
        action={<AnchorButton variant="neutral" to="/pekerjaan">Kembali ke daftar</AnchorButton>}
      />
    )
  }

  const progressItems = progressView?.items ?? []
  const weekOptions = Array.from({ length: maxWeek }, (_, index) => index + 1)

  const featuredStats: Array<{
    label: string
    value: string
    hint: string
    tone: MetricTone
  }> = [
    {
      label: 'Pagu',
      value: formatCurrency(pekerjaan.pagu ?? progressView?.pekerjaan?.pagu ?? 0),
      hint: lokasiLabel,
      tone: 'success',
    },
    {
      label: 'Progress',
      value: formatPercent(progressValue),
      hint: progressView?.totals ? `Bobot ${formatPercent(progressView.totals.total_bobot ?? 0)}` : 'Menunggu data progress',
      tone: progressTone(progressValue) as MetricTone,
    },
    {
      label: 'Foto',
      value: formatNumber(totalFoto),
      hint: statusFotoText(statusFoto),
      tone: statusFotoTone(statusFoto) as MetricTone,
    },
    {
      label: 'Penerima',
      value: formatNumber(totalPenerima),
      hint: outputList.length ? `${formatNumber(outputList.length)} output` : 'Belum ada output',
      tone: (totalPenerima > 0 ? 'info' : 'neutral') as MetricTone,
    },
  ]

  return (
    <div className="stack pb-8">
      <Surface className="panel overflow-hidden border-[3px] border-black bg-[linear-gradient(135deg,#fff8ef_0%,#fffdf8_46%,#eef7ff_100%)] shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.55fr)_320px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <AnchorButton variant="neutral" to="/pekerjaan" className="neo-button--sm">
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </AnchorButton>
              <Badge tone="info">Detail pekerjaan</Badge>
              <Badge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black leading-tight text-black md:text-4xl">{pekerjaan.nama_paket}</h1>
              <p className="max-w-3xl text-sm leading-6 text-black/70 md:text-base">
                {kegiatanLabel} - TA {tahunLabel} - {lokasiLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sourceBadges.length ? (
                sourceBadges.map((source) => (
                  <Badge key={source} tone="neutral">
                    {source}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral">Sumber penugasan belum tersedia</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="neutral" onClick={() => setActiveTab('foto')}>
                <Camera size={16} />
                <span>Kelola foto</span>
              </Button>
              <Button type="button" variant="neutral" onClick={() => setActiveTab('penerima')}>
                <FileText size={16} />
                <span>Penerima</span>
              </Button>
              <Button type="button" variant="neutral" onClick={() => setActiveTab('progress')}>
                <RefreshCcw size={16} />
                <span>Progress</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <InfoStrip label="Pengawas" value={pengawasLabel} />
            <InfoStrip label="Pendamping" value={pendampingLabel} />
            <InfoStrip label="Dibuat" value={formatDate(pekerjaan.created_at ?? null)} />
            <InfoStrip label="Diperbarui" value={formatDateTime(pekerjaan.updated_at ?? null)} />
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {featuredStats.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} tone={item.tone} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <Surface className="panel p-3">
            <div className="flex flex-wrap gap-2">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === tab.id ? 'bg-black text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-black/5'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </Surface>

          {activeTab === 'ringkasan' ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <Surface className="panel p-6">
                <SectionHeader
                  title="Ringkasan inti"
                  description="Informasi utama pekerjaan, kontrak, dan hubungan data yang perlu dipantau."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <DetailList
                    items={[
                      ['Kegiatan', kegiatanLabel],
                      ['Tahun anggaran', tahunLabel],
                      ['Lokasi', lokasiLabel],
                      ['Pengawas', pengawasLabel],
                      ['Pendamping', pendampingLabel],
                      ['Nomor rekening', stringValue(pekerjaan.kode_rekening)],
                    ]}
                  />

                  <DetailList
                    items={[
                      ['Output', outputList.length ? `${formatNumber(outputList.length)} item` : '-'],
                      ['Pagu', formatCurrency(pekerjaan.pagu ?? 0)],
                      ['Progress', formatPercent(progressValue)],
                      ['Foto', formatNumber(totalFoto)],
                      ['Penerima', formatNumber(totalPenerima)],
                      ['Foto wajib', stringValue(pekerjaan.foto_required_count)],
                    ]}
                  />
                </div>
              </Surface>

              <Surface className="panel p-6">
                <SectionHeader
                  title="Output dan foto"
                  description="Ringkasan output pekerjaan dan slot foto yang tersedia."
                />
                {outputList.length ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {outputList.map((output) => {
                      const outputPhotos = fotoList.filter((item) => item.komponen_id === output.id)
                      return (
                        <div
                          key={output.id}
                          className="rounded-[1.25rem] border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-black text-black">{output.komponen}</div>
                              <div className="text-sm text-black/60">
                                {stringValue(output.volume)} {output.satuan || ''}
                              </div>
                            </div>
                            {output.penerima_is_optional ? <Badge tone="info">Opsional</Badge> : <Badge tone="neutral">Wajib</Badge>}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge tone="neutral">{formatNumber(outputPhotos.length)} foto</Badge>
                            <Badge tone="neutral">Output #{output.id}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada output"
                    description="Backend belum mengirim daftar output untuk pekerjaan ini."
                  />
                )}
              </Surface>
            </div>
          ) : null}

          {activeTab === 'penerima' ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <Surface className="panel p-6">
                <SectionHeader
                  title={editingPenerimaId ? 'Edit penerima manfaat' : 'Tambah penerima manfaat'}
                  description="Gunakan mode komunal jika penerima mewakili kelompok, lalu jumlah jiwa dan NIK akan dinonaktifkan."
                  action={
                    editingPenerimaId ? (
                      <Button type="button" variant="neutral" onClick={resetPenerimaForm}>
                        Reset form
                      </Button>
                    ) : null
                  }
                />

                <form className="mt-5 space-y-5" onSubmit={handlePenerimaSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nama">
                      <Input
                        value={penerimaForm.nama}
                        onChange={(event) => setPenerimaForm((current) => ({ ...current, nama: event.target.value }))}
                        placeholder="Nama penerima"
                        required
                      />
                    </Field>
                    <Field label="Jumlah jiwa">
                      <Input
                        type="number"
                        min="0"
                        value={penerimaForm.jumlah_jiwa}
                        onChange={(event) => setPenerimaForm((current) => ({ ...current, jumlah_jiwa: event.target.value }))}
                        disabled={penerimaForm.is_komunal}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="NIK">
                      <Input
                        value={penerimaForm.nik}
                        onChange={(event) => setPenerimaForm((current) => ({ ...current, nik: event.target.value }))}
                        disabled={penerimaForm.is_komunal}
                        placeholder="NIK atau nomor identitas"
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={penerimaForm.is_komunal}
                        onChange={(event) =>
                          setPenerimaForm((current) => ({
                            ...current,
                            is_komunal: event.target.checked,
                          }))
                        }
                      />
                      <span>Komunal</span>
                    </label>
                    <span className="text-sm text-black/60">
                      Saat komunal aktif, jumlah jiwa dan NIK tidak perlu diisi.
                    </span>
                  </div>

                  <Field label="Alamat">
                    <Textarea
                      rows={3}
                      value={penerimaForm.alamat}
                      onChange={(event) => setPenerimaForm((current) => ({ ...current, alamat: event.target.value }))}
                      placeholder="Alamat singkat atau catatan lokasi"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" isLoading={createPenerimaMutation.isPending || updatePenerimaMutation.isPending}>
                      {editingPenerimaId ? 'Simpan perubahan' : 'Tambah penerima'}
                    </Button>
                    <Button type="button" variant="neutral" onClick={resetPenerimaForm}>
                      Batal
                    </Button>
                  </div>
                </form>
              </Surface>

              <Surface className="panel p-6">
                <SectionHeader
                  title="Daftar penerima"
                  description="Data yang tersimpan akan muncul di sini dan bisa diedit atau dihapus."
                />

                {penerimaList.length ? (
                  <div className="table-wrap mt-5">
                    <table className="neo-table">
                      <thead>
                        <tr>
                          <th>Nama</th>
                          <th>Tipe</th>
                          <th>Identitas</th>
                          <th>Alamat</th>
                          <th>Dibuat</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {penerimaList.map((penerima) => (
                          <tr key={penerima.id}>
                            <td>
                              <div className="table-title">{penerima.nama}</div>
                            </td>
                            <td>
                              <Badge tone={penerima.is_komunal ? 'info' : 'neutral'}>
                                {penerima.is_komunal ? 'Komunal' : 'Individu'}
                              </Badge>
                            </td>
                            <td>
                              <div className="table-subtitle">
                                Jiwa {stringValue(penerima.jumlah_jiwa)}
                                <br />
                                NIK {stringValue(penerima.nik)}
                              </div>
                            </td>
                            <td>{penerima.alamat || '-'}</td>
                            <td>{formatDateTime(penerima.created_at)}</td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="neutral" size="sm" onClick={() => handleEditPenerima(penerima)}>
                                  <Edit3 size={14} />
                                  <span>Edit</span>
                                </Button>
                                <Button type="button" variant="danger" size="sm" onClick={() => setDeletePenerimaTarget(penerima)}>
                                  <Trash2 size={14} />
                                  <span>Hapus</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="Belum ada penerima" description="Tambahkan penerima manfaat pertama untuk pekerjaan ini." />
                )}
              </Surface>
            </div>
          ) : null}

          {activeTab === 'foto' ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <Surface className="panel p-6">
                <SectionHeader
                  title="Matriks foto"
                  description="Setiap output memiliki slot 0% / 25% / 50% / 75% / 100% untuk memudahkan kontrol dokumentasi."
                />

                {outputPhotoMatrix.length ? (
                  <div className="mt-5 space-y-6">
                    {outputPhotoMatrix.map(({ output, slots, count }) => (
                      <div
                        key={output.id}
                        className="rounded-[1.25rem] border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-black">{output.komponen}</div>
                            <div className="text-sm text-black/60">
                              {stringValue(output.volume)} {output.satuan || ''}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone="neutral">{formatNumber(count)} foto</Badge>
                            {output.penerima_is_optional ? <Badge tone="info">Penerima opsional</Badge> : <Badge tone="warning">Wajib dokumentasi</Badge>}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          {slots.map(({ slot, foto }) => (
                            <PhotoSlotCard
                              key={`${output.id}-${slot}`}
                              slot={slot}
                              foto={foto}
                              onClick={() => {
                                if (foto) {
                                  setPreviewFoto(foto)
                                } else {
                                  openUploadTarget(output, slot)
                                }
                              }}
                              onUpload={() => openUploadTarget(output, slot)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : fotoList.length ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {fotoList.map((foto) => (
                      <button
                        key={foto.id}
                        type="button"
                        className="overflow-hidden rounded-[1.25rem] border-[3px] border-black bg-white text-left shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
                        onClick={() => setPreviewFoto(foto)}
                      >
                        <img
                          src={foto.foto_thumb_url || foto.foto_url || ''}
                          alt={foto.keterangan || 'Foto pekerjaan'}
                          className="h-40 w-full object-cover"
                        />
                        <div className="space-y-1 p-4">
                          <div className="text-sm font-black text-black">{foto.keterangan || 'Foto pekerjaan'}</div>
                          <div className="text-xs text-black/60">{formatDateTime(foto.created_at)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Belum ada foto" description="Belum ada dokumentasi yang tersimpan untuk pekerjaan ini." />
                )}
              </Surface>

              <div className="space-y-6">
                <Surface className="panel p-6">
                  <SectionHeader
                    title="Kontrol foto"
                    description="Gunakan matriks untuk unggah per output dan per slot tanpa kehilangan konteks."
                  />
                  <div className="mt-5 space-y-3">
                    <DetailRow label="Status" value={statusFotoText(statusFoto)} />
                    <DetailRow label="Total foto" value={formatNumber(totalFoto)} />
                    <DetailRow label="Output" value={formatNumber(outputList.length)} />
                    <DetailRow label="Foto wajib" value={stringValue(pekerjaan.foto_required_count)} />
                  </div>
                </Surface>

                <Surface className="panel p-6">
                  <SectionHeader
                    title="Panduan singkat"
                    description="Klik kartu slot untuk preview, lalu ganti atau upload foto baru."
                  />
                  <div className="mt-4 space-y-3 text-sm leading-6 text-black/70">
                    <p>• Slot kosong akan menampilkan tombol upload langsung dari konteks output.</p>
                    <p>• Foto yang sudah ada bisa dibuka untuk preview penuh dan diganti dari modal.</p>
                    <p>• Status foto mengikuti jumlah foto yang tersedia dan kebutuhan minimal.</p>
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}

          {activeTab === 'progress' ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <Surface className="panel p-6">
                <SectionHeader
                  title="Progress pekerjaan"
                  description="Lihat total progress dan rincian mingguan per item."
                />

                {progressQuery.isPending ? (
                  <div className="mt-6 flex items-center gap-3 text-black/70">
                    <Spinner />
                    <span>Memuat progress...</span>
                  </div>
                ) : progressView ? (
                  <div className="mt-5 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Total bobot"
                        value={formatPercent(progressView.totals?.total_bobot ?? 0)}
                        tone="info"
                        hint="Akumulasi bobot item"
                      />
                      <MetricCard
                        label="Realisasi akumulasi"
                        value={formatPercent(progressView.totals?.total_accumulated_real ?? 0)}
                        tone="success"
                        hint="Rata-rata realisasi mingguan"
                      />
                      <MetricCard
                        label="Progress terhitung"
                        value={formatPercent(progressView.totals?.total_weighted_progress ?? 0)}
                        tone={progressTone(progressView.totals?.total_weighted_progress ?? 0) as 'danger' | 'warning' | 'success'}
                        hint="Dari komposisi progress"
                      />
                      <MetricCard
                        label="Minggu maksimum"
                        value={formatNumber(progressView.max_minggu ?? 0)}
                        tone="neutral"
                        hint="Batas waktu yang tersedia"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Label className="text-sm font-black">Minggu aktif</Label>
                      <select
                        className="neo-input min-w-[140px]"
                        value={activeWeek}
                        onChange={(event) => setActiveWeek(Number(event.target.value))}
                      >
                        {weekOptions.map((week) => (
                          <option key={week} value={week}>
                            Minggu {week}
                          </option>
                        ))}
                      </select>
                    </div>

                    {progressItems.length ? (
                      <div className="table-wrap">
                        <table className="neo-table">
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
                            {progressItems.map((item) => {
                              const weekData = item.weekly_data?.[String(activeWeek)]
                              const realisasi = Number(weekData?.realisasi ?? 0)
                              return (
                                <tr key={`${item.nama_item || item.rincian_item || activeWeek}`}>
                                  <td>
                                    <div className="table-title">{item.nama_item || item.rincian_item || '-'}</div>
                                    {item.rincian_item ? <div className="table-subtitle">{item.rincian_item}</div> : null}
                                  </td>
                                  <td>{item.satuan || '-'}</td>
                                  <td>{stringValue(item.target_volume)}</td>
                                  <td>{stringValue(weekData?.rencana)}</td>
                                  <td>{stringValue(weekData?.realisasi)}</td>
                                  <td>
                                    <Badge tone={progressTone(realisasi) as 'danger' | 'warning' | 'success'}>
                                      {realisasi > 0 ? formatPercent(realisasi) : 'Belum diisi'}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState title="Belum ada item progress" description="Progress report belum memiliki detail item." />
                    )}
                  </div>
                ) : (
                  <EmptyState title="Progress belum tersedia" description="Backend belum mengirim ringkasan progress untuk pekerjaan ini." />
                )}
              </Surface>

              <div className="space-y-6">
                <Surface className="panel p-6">
                  <SectionHeader
                    title="Navigasi minggu"
                    description="Pilih minggu aktif untuk melihat detail rencana dan realisasi item."
                  />
                  <div className="mt-5 space-y-3">
                    <DetailRow label="Minggu aktif" value={`Minggu ${activeWeek}`} />
                    <DetailRow label="Minggu maksimum" value={formatNumber(maxWeek)} />
                    <DetailRow label="Item progress" value={formatNumber(progressItems.length)} />
                  </div>
                </Surface>

                <Surface className="panel p-6">
                  <SectionHeader
                    title="Ringkasan data"
                    description="Total bobot dan realisasi membantu menilai apakah paket berjalan sesuai target."
                  />
                  <div className="mt-5 space-y-3">
                    <DetailRow label="Total bobot" value={formatPercent(progressView?.totals?.total_bobot ?? 0)} />
                    <DetailRow label="Realisasi akumulasi" value={formatPercent(progressView?.totals?.total_accumulated_real ?? 0)} />
                    <DetailRow label="Progress terhitung" value={formatPercent(progressView?.totals?.total_weighted_progress ?? 0)} />
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}

          {activeTab === 'tiket' ? (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_320px]">
              <Surface className="panel p-6">
                <SectionHeader
                  title="Tiket pekerjaan"
                  description="Daftar tiket yang terkait dengan pekerjaan ini."
                  action={<AnchorButton variant="neutral" to="/tiket">Buka halaman tiket</AnchorButton>}
                />

                {tiketQuery.isPending ? (
                  <div className="mt-6 flex items-center gap-3 text-black/70">
                    <Spinner />
                    <span>Memuat tiket...</span>
                  </div>
                ) : tiketList.length ? (
                  <div className="table-wrap mt-5">
                    <table className="neo-table">
                      <thead>
                        <tr>
                          <th>Subjek</th>
                          <th>Kategori</th>
                          <th>Prioritas</th>
                          <th>Status</th>
                          <th>Dibuat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiketList.map((tiket) => (
                          <tr key={tiket.id}>
                            <td>
                              <div className="table-title">{tiket.subjek}</div>
                              <div className="table-subtitle">{tiket.deskripsi || '-'}</div>
                            </td>
                            <td>{tiket.kategori || '-'}</td>
                            <td>
                              <Badge tone={tiket.prioritas === 'tinggi' ? 'danger' : tiket.prioritas === 'sedang' ? 'warning' : 'neutral'}>
                                {tiket.prioritas || '-'}
                              </Badge>
                            </td>
                            <td>
                              <Badge tone={tiket.status === 'closed' ? 'success' : 'warning'}>{tiket.status || 'open'}</Badge>
                            </td>
                            <td>{formatDateTime(tiket.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="Belum ada tiket" description="Tiket untuk pekerjaan ini belum dibuat." />
                )}
              </Surface>

              <div className="space-y-6">
                <Surface className="panel p-6">
                  <SectionHeader
                    title="Status cepat"
                    description="Ringkasan tiket yang langsung membantu scanning prioritas."
                  />
                  <div className="mt-5 space-y-3">
                    <DetailRow label="Jumlah tiket" value={formatNumber(tiketList.length)} />
                    <DetailRow
                      label="Terbuka"
                      value={formatNumber(tiketList.filter((item) => `${item.status || 'open'}` !== 'closed').length)}
                    />
                    <DetailRow
                      label="Tertutup"
                      value={formatNumber(tiketList.filter((item) => `${item.status || ''}` === 'closed').length)}
                    />
                  </div>
                </Surface>

                <Surface className="panel p-6">
                  <SectionHeader
                    title="Aksi cepat"
                    description="Gunakan halaman tiket terpisah untuk input dan tindak lanjut lanjutan."
                  />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <AnchorButton variant="neutral" to="/tiket" className="neo-button--sm">
                      Buka tiket
                    </AnchorButton>
                    <AnchorButton variant="neutral" to="/pekerjaan" className="neo-button--sm">
                      Daftar pekerjaan
                    </AnchorButton>
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6">
          <Surface className="panel p-6">
            <SectionHeader title="Metadata kerja" description="Ringkasan data utama untuk dipindai cepat." />
            <div className="mt-5 space-y-3">
              <DetailRow label="Lokasi" value={lokasiLabel} />
              <DetailRow label="Kegiatan" value={kegiatanLabel} />
              <DetailRow label="Tahun" value={tahunLabel} />
              <DetailRow label="Pagu" value={formatCurrency(pekerjaan.pagu ?? 0)} />
              <DetailRow label="Progress" value={formatPercent(progressValue)} />
              <DetailRow label="Foto" value={statusFotoText(statusFoto)} />
              <DetailRow label="Penerima" value={formatNumber(totalPenerima)} />
              <DetailRow label="Output" value={formatNumber(outputList.length)} />
            </div>
          </Surface>

          <Surface className="panel p-6">
            <SectionHeader title="Penugasan" description="Siapa yang bertanggung jawab pada paket ini." />
            <div className="mt-5 space-y-3">
              <DetailRow label="Pengawas" value={pengawasLabel} />
              <DetailRow label="Pendamping" value={pendampingLabel} />
              <DetailRow label="Dibuat" value={formatDateTime(pekerjaan.created_at)} />
              <DetailRow label="Diperbarui" value={formatDateTime(pekerjaan.updated_at)} />
            </div>
          </Surface>

          <Surface className="panel p-6">
            <SectionHeader title="Akses cepat" description="Navigasi ke halaman yang sering dibuka." />
            <div className="mt-5 flex flex-wrap gap-2">
              <AnchorButton variant="neutral" to="/pekerjaan" className="neo-button--sm">
                Daftar pekerjaan
              </AnchorButton>
              <AnchorButton variant="neutral" to="/tiket" className="neo-button--sm">
                Daftar tiket
              </AnchorButton>
              <AnchorButton variant="neutral" to="/profile" className="neo-button--sm">
                Profil
              </AnchorButton>
            </div>
          </Surface>
        </aside>
      </div>

      <ConfirmModal
        open={Boolean(deletePenerimaTarget)}
        title="Hapus penerima?"
        description={deletePenerimaTarget ? `Penerima "${deletePenerimaTarget.nama}" akan dihapus dari pekerjaan ini.` : undefined}
        confirmLabel="Hapus"
        confirmTone="danger"
        isLoading={deletePenerimaMutation.isPending}
        onCancel={() => setDeletePenerimaTarget(null)}
        onConfirm={() => {
          if (deletePenerimaTarget) {
            deletePenerimaMutation.mutate(deletePenerimaTarget.id)
          }
        }}
      />

      <ConfirmModal
        open={Boolean(deleteFotoTarget)}
        title="Hapus foto?"
        description={deleteFotoTarget ? `Foto "${deleteFotoTarget.keterangan || 'dokumentasi'}" akan dihapus.` : undefined}
        confirmLabel="Hapus"
        confirmTone="danger"
        isLoading={deleteFotoMutation.isPending}
        onCancel={() => setDeleteFotoTarget(null)}
        onConfirm={() => {
          if (deleteFotoTarget) {
            deleteFotoMutation.mutate(deleteFotoTarget.id)
          }
        }}
      />

      {previewFoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewFoto(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <Surface className="w-full max-w-4xl border-[3px] border-black bg-white p-4 shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/60">Preview foto</div>
                <div className="text-2xl font-black text-black">{previewFoto.keterangan || 'Foto pekerjaan'}</div>
                <div className="mt-1 text-sm text-black/60">{formatDateTime(previewFoto.created_at)}</div>
              </div>
              <Button type="button" variant="neutral" onClick={() => setPreviewFoto(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_320px]">
              <div className="overflow-hidden rounded-[1.15rem] border-[3px] border-black bg-black">
                <img
                  src={previewFoto.foto_url || previewFoto.foto_thumb_url || ''}
                  alt={previewFoto.keterangan || 'Preview foto'}
                  className="h-full w-full max-h-[70vh] object-contain bg-black"
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.15rem] border-[3px] border-black bg-[#fffdf6] p-4">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-black/60">Detail</div>
                  <div className="mt-3 space-y-3">
                    <DetailRow label="Output" value={previewFoto.komponen?.komponen || stringValue(previewFoto.komponen_id)} />
                    <DetailRow label="Slot" value={previewFoto.keterangan || '-'} />
                    <DetailRow label="Koordinat" value={previewFoto.koordinat || '-'} />
                    <DetailRow label="Validasi" value={previewFoto.validasi_koordinat ? 'Valid' : 'Belum valid'} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => {
                      const relatedOutput = outputList.find((output) => output.id === previewFoto.komponen_id)
                      if (relatedOutput) {
                        setUploadTarget({
                          output: relatedOutput,
                          slot: previewFoto.keterangan || '0%',
                        })
                        setUploadFile(null)
                        setPreviewFoto(null)
                      }
                    }}
                  >
                    <Upload size={16} />
                    <span>Ganti foto</span>
                  </Button>
                  <Button type="button" variant="danger" onClick={() => setDeleteFotoTarget(previewFoto)}>
                    <Trash2 size={16} />
                    <span>Hapus foto</span>
                  </Button>
                </div>
              </div>
            </div>
            </Surface>
          </div>
        </div>
      ) : null}

      {uploadTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setUploadTarget(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <Surface className="w-full max-w-2xl border-[3px] border-black bg-white p-5 shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/60">Upload foto</div>
                <div className="text-2xl font-black text-black">{uploadTarget.output.komponen}</div>
                <div className="mt-1 text-sm text-black/60">
                  Slot {uploadTarget.slot} - {stringValue(uploadTarget.output.volume)} {uploadTarget.output.satuan || ''}
                </div>
              </div>
              <Button type="button" variant="neutral" onClick={() => setUploadTarget(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1.15rem] border-[3px] border-black bg-[#fffdf6] p-4">
                <div className="text-sm font-bold text-black">Pilih file foto</div>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="neo-input mt-3 w-full"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                />
                <div className="mt-3 text-sm text-black/60">
                  Foto akan dikirim ke backend dengan konteks output dan slot yang dipilih.
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  isLoading={uploadFotoMutation.isPending}
                  disabled={!uploadFile}
                  onClick={() => {
                    if (!uploadFile) return
                    uploadFotoMutation.mutate({
                      file: uploadFile,
                      output: uploadTarget.output,
                      slot: uploadTarget.slot,
                    })
                  }}
                >
                  <Upload size={16} />
                  <span>Unggah foto</span>
                </Button>
                <Button type="button" variant="neutral" onClick={() => setUploadTarget(null)}>
                  Batal
                </Button>
              </div>
            </div>
            </Surface>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function resolveFotoStatus(detail?: Pick<PekerjaanDetail, 'foto_status' | 'foto_count' | 'foto_required_count'> | null) {
  if (detail?.foto_status === 'belum_ada_foto' || detail?.foto_status === 'belum_selesai' || detail?.foto_status === 'selesai') {
    return detail.foto_status
  }

  const fotoCount = Number(detail?.foto_count ?? 0)
  const fotoRequired = Number(detail?.foto_required_count ?? 0)

  if (fotoCount <= 0) {
    return 'belum_ada_foto'
  }

  if (fotoRequired > 0 && fotoCount < fotoRequired) {
    return 'belum_selesai'
  }

  return 'selesai'
}

function statusFotoText(status: ReturnType<typeof resolveFotoStatus>) {
  if (status === 'belum_ada_foto') return 'Belum ada foto'
  if (status === 'belum_selesai') return 'Belum selesai'
  return 'Lengkap'
}

function statusFotoTone(status: ReturnType<typeof resolveFotoStatus>) {
  if (status === 'belum_ada_foto') return 'warning' as const
  if (status === 'belum_selesai') return 'danger' as const
  return 'success' as const
}

function stringValue(value?: number | string | null) {
  if (value === undefined || value === null) return '-'
  const text = `${value}`.trim()
  return text || '-'
}

function recordText(record: unknown, key: string) {
  if (!record || typeof record !== 'object') return undefined
  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'string' || typeof value === 'number' ? `${value}` : undefined
}

function pickFirstText(values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = `${value}`.trim()
    if (text) return text
  }
  return '-'
}

function normalizeArray(values?: string[] | null) {
  return (values || []).map((value) => `${value}`.trim()).filter(Boolean)
}

function normalizeSlotLabel(value?: string | null) {
  return `${value || ''}`.trim()
}

function normalizeOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : undefined
}

type PenerimaPayload = {
  pekerjaan_id: number
  nama: string
  jumlah_jiwa?: number
  nik?: string
  alamat?: string
  is_komunal?: boolean
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[1rem] border-2 border-black bg-white px-4 py-3">
      <span className="text-sm font-bold text-black/60">{label}</span>
      <strong className="text-right text-sm font-black text-black">{value}</strong>
    </div>
  )
}

function DetailList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="space-y-3">
      {items.map(([label, value]) => (
        <DetailRow key={label} label={label} value={value} />
      ))}
    </div>
  )
}

function InfoStrip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[1rem] border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-black/50">{label}</div>
      <div className="mt-1 text-sm font-black text-black">{value}</div>
    </div>
  )
}

function PhotoSlotCard({
  slot,
  foto,
  onClick,
  onUpload,
}: {
  slot: string
  foto: Foto | undefined
  onClick: () => void
  onUpload: () => void
}) {
  return (
    <div
      className="group overflow-hidden rounded-[1rem] border-[3px] border-black bg-[#fffdf8] text-left shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
        <span>{slot}</span>
        {foto ? <Badge tone="success">Ada foto</Badge> : <Badge tone="warning">Kosong</Badge>}
      </div>
      <div className="aspect-[4/3] bg-black/5">
        {foto ? (
          <img
            src={foto.foto_thumb_url || foto.foto_url || ''}
            alt={foto.keterangan || slot}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <Camera size={28} className="text-black/35" />
            <div className="text-sm font-bold text-black/50">Belum ada foto</div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-black">{foto?.keterangan || `Slot ${slot}`}</div>
          <div className="text-xs text-black/55">{foto ? formatDateTime(foto.created_at) : 'Klik untuk unggah'}</div>
        </div>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onUpload()
          }}
        >
          <Upload size={14} />
          <span>{foto ? 'Ganti' : 'Upload'}</span>
        </Button>
      </div>
    </div>
  )
}

export {}
