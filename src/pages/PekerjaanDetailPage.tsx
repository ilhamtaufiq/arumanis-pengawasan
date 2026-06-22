import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera, Check, ChevronDown, Edit3, FileText, MapPin, MessageSquareText, Printer, RefreshCcw, Save, Shield, Trash2, Upload, X } from 'lucide-react'
import {
  createFoto,
  createOutput,
  createPenerima,
  createTiket,
  deleteFoto,
  deleteOutput,
  deletePenerima,
  getPekerjaanDetail,
  getProgressReport,
  getTiketList,
  updateOutput,
  updatePenerima,
  updateProgress,
} from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, progressTone } from '@/lib/format'
import { extractCoordinates } from '@/lib/image-gps-utils'
import {
  AnchorButton,
  Badge,
  Button,
  cn,
  ConfirmModal,
  DetailProgressFill,
  DetailRow,
  EmptyState,
  FieldGroup,
  Input,
  Label,
  LoadingRow,
  PhotoMatrix,
  Spinner,
  StatusChip,
  Textarea,
} from '@/components/ui'
import type { Foto, Output, PekerjaanDetail, Penerima, ProgressItem, ProgressReportView, Tiket } from '@/lib/types'

type DetailTab = 'ringkasan' | 'output' | 'penerima' | 'foto' | 'progress' | 'tiket'

type PenerimaFormState = {
  nama: string
  jumlah_jiwa: string
  nik: string
  alamat: string
  is_komunal: boolean
}

const penerimaSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  jumlah_jiwa: z.string().optional(),
  nik: z.string().optional(),
  alamat: z.string().optional(),
  is_komunal: z.boolean(),
}).refine((data) => {
  if (!data.is_komunal) {
    return data.jumlah_jiwa && data.nik && data.jumlah_jiwa.trim() !== '' && data.nik.trim() !== ''
  }
  return true
}, {
  message: "Jumlah jiwa dan NIK wajib diisi untuk penerima individu",
  path: ["jumlah_jiwa"],
})

type UploadTarget = {
  output: Output
  slot: string
  penerima?: Penerima | undefined
}

type MetricTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info'

const OUTPUT_KOMPONEN_OPTIONS = [
  'Sambungan Rumah',
  'MCK',
  'MCK Individu',
  'MCK Komunal',
  'Pipa',
  'Broncaptering',
  'Reservoir',
  'Tangki Septik Individu',
  'Tangki Septik Komunal',
  'Sumur Bor',
  'Pompa',
] as const

const OUTPUT_SATUAN_OPTIONS = ['Unit', 'Meter', 'Meter Persegi', 'Meter Kubik'] as const

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: ReactNode }> = [
  { id: 'ringkasan', label: 'Ringkasan', icon: <Shield size={14} /> },
  { id: 'output', label: 'Output', icon: <FileText size={14} /> },
  { id: 'penerima', label: 'Penerima', icon: <FileText size={14} /> },
  { id: 'foto', label: 'Foto', icon: <Camera size={14} /> },
  { id: 'progress', label: 'Progress', icon: <RefreshCcw size={14} /> },
  { id: 'tiket', label: 'Tiket', icon: <MessageSquareText size={14} /> },
]

const FOTO_SLOTS = ['0%', '25%', '50%', '75%', '100%'] as const

const EMPTY_PENERIMA_FORM: PenerimaFormState = {
  nama: '',
  jumlah_jiwa: '',
  nik: '',
  alamat: '',
  is_komunal: false,
}

const TIKET_KATEGORI_OPTIONS = [
  { value: 'other', label: 'Umum' },
  { value: 'bug', label: 'Bug' },
  { value: 'request', label: 'Request' },
  { value: 'lapangan', label: 'Lapangan' },
  { value: 'document', label: 'Dokumen' },
] as const

const TIKET_PRIORITAS_OPTIONS = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
] as const

const TIKET_KATEGORI_PRIORITAS: Record<(typeof TIKET_KATEGORI_OPTIONS)[number]['value'], (typeof TIKET_PRIORITAS_OPTIONS)[number]['value']> = {
  other: 'low',
  bug: 'high',
  request: 'medium',
  lapangan: 'high',
  document: 'medium',
}

const tiketSchema = z.object({
  subjek: z.string().min(1, 'Subjek wajib diisi'),
  deskripsi: z.string().min(1, 'Deskripsi wajib diisi'),
  kategori: z.enum(['bug', 'request', 'lapangan', 'document', 'other']),
  prioritas: z.enum(['low', 'medium', 'high']),
})

type TiketFormValues = z.infer<typeof tiketSchema>

const EMPTY_TIKET_FORM: TiketFormValues = {
  subjek: '',
  deskripsi: '',
  kategori: 'other',
  prioritas: 'low',
}

export function PekerjaanDetailPage() {
  const { pekerjaanId: rawPekerjaanId } = useParams()
  const pekerjaanId = Number(rawPekerjaanId)
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const tiketFileRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<DetailTab>('ringkasan')
  const [activeWeek, setActiveWeek] = useState(1)
  const [previewPhotos, setPreviewPhotos] = useState<Foto[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const currentPreviewFoto = previewPhotos[previewIndex] || null
  const [deleteFotoTarget, setDeleteFotoTarget] = useState<Foto | null>(null)
  const [deletePenerimaTarget, setDeletePenerimaTarget] = useState<Penerima | null>(null)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadKoordinat, setUploadKoordinat] = useState('')
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [editingPenerimaId, setEditingPenerimaId] = useState<number | null>(null)
  const [penerimaFormOpen, setPenerimaFormOpen] = useState(false)
  const [tiketFormOpen, setTiketFormOpen] = useState(false)
  const [tiketAttachment, setTiketAttachment] = useState<File | null>(null)

  const penerimaForm = useForm({
    resolver: zodResolver(penerimaSchema),
    defaultValues: EMPTY_PENERIMA_FORM,
  })

  const tiketForm = useForm({
    resolver: zodResolver(tiketSchema),
    defaultValues: EMPTY_TIKET_FORM,
  })

  const { register, handleSubmit, watch, reset: resetPenerimaFormHook, setValue, formState: { errors } } = penerimaForm
  const {
    register: registerTiket,
    handleSubmit: handleSubmitTiket,
    watch: watchTiket,
    reset: resetTiketFormHook,
    setValue: setTiketValue,
    formState: { errors: tiketErrors },
  } = tiketForm
  const isKomunal = watch('is_komunal') as boolean
  const tiketKategori = watchTiket('kategori')
  const showTiketAttachment = tiketKategori === 'lapangan' || tiketKategori === 'document'
  const [editedProgress, setEditedProgress] = useState<Record<string, { rencana?: string; realisasi?: string }>>({})
  const [progressSaved, setProgressSaved] = useState(false)
  const [editingOutputId, setEditingOutputId] = useState<number | null>(null)
  const [outputForm, setOutputForm] = useState({
    komponen: '',
    satuan: '',
    volume: '',
    penerima_is_optional: false,
  })
  const [deleteOutputTarget, setDeleteOutputTarget] = useState<Output | null>(null)

  function closePhotoPreview() {
    setPreviewPhotos([])
    setPreviewIndex(0)
  }

  function openPhotoPreview(photos: Foto[], startIndex: number = 0) {
    if (!photos.length) return
    setPreviewPhotos(photos)
    setPreviewIndex(Math.max(0, Math.min(startIndex, photos.length - 1)))
  }

  // Keyboard support for photo preview (ESC + arrows for next/prev when multiple photos in slot)
  useEffect(() => {
    if (!currentPreviewFoto) return

    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePhotoPreview()
      }
      if (previewPhotos.length > 1) {
        if (e.key === 'ArrowLeft') {
          setPreviewIndex((i) => (i - 1 + previewPhotos.length) % previewPhotos.length)
        }
        if (e.key === 'ArrowRight') {
          setPreviewIndex((i) => (i + 1) % previewPhotos.length)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentPreviewFoto, previewPhotos.length])

  // Auto extract coordinates when a file is selected for upload
  useEffect(() => {
    if (!uploadFile || !uploadTarget) return

    setExtractionStatus('Mencoba mengekstrak koordinat dari foto...')

    extractCoordinates(uploadFile)
      .then((coords) => {
        if (coords) {
          setUploadKoordinat(coords)
          setExtractionStatus('Koordinat berhasil diekstrak.')
        } else {
          setExtractionStatus('Tidak ada koordinat yang ditemukan pada foto.')
        }
      })
      .catch((err) => {
        console.error('Extraction error:', err)
        setExtractionStatus('Gagal mengekstrak koordinat.')
      })
  }, [uploadFile, uploadTarget])

  useEffect(() => {
    if (!tiketKategori) return
    setTiketValue('prioritas', TIKET_KATEGORI_PRIORITAS[tiketKategori], { shouldDirty: true })
    if (tiketKategori !== 'lapangan' && tiketKategori !== 'document') {
      setTiketAttachment(null)
      if (tiketFileRef.current) {
        tiketFileRef.current.value = ''
      }
    }
  }, [tiketKategori, setTiketValue])

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
    if (isKomunal) {
      setValue('jumlah_jiwa', '')
      setValue('nik', '')
    }
  }, [isKomunal, setValue])

  const outputPhotoMatrix = useMemo(() => {
    const matrix: { output: Output; slots: { slot: string; foto: Foto | undefined }[]; count: number; penerima?: Penerima | undefined }[] = []

    outputList.forEach((output) => {
      if (output.penerima_is_optional) {
        // Komunal
        const slots = FOTO_SLOTS.map((slot) => {
          const foto = fotoList.find(
            (item) => item.komponen_id === output.id && normalizeSlotLabel(item.keterangan) === slot && !item.penerima_id,
          )
          return { slot, foto }
        })
        matrix.push({
          output,
          slots,
          count: fotoList.filter((item) => item.komponen_id === output.id && !item.penerima_id).length,
        })
      } else {
        // Individual
        if (penerimaList.length === 0) {
          const slots = FOTO_SLOTS.map((slot) => {
            const foto = fotoList.find(
              (item) => item.komponen_id === output.id && normalizeSlotLabel(item.keterangan) === slot && !item.penerima_id,
            )
            return { slot, foto }
          })
          matrix.push({
            output,
            slots,
            count: fotoList.filter((item) => item.komponen_id === output.id && !item.penerima_id).length,
          })
        } else {
          penerimaList.forEach((penerima) => {
            const slots = FOTO_SLOTS.map((slot) => {
              const foto = fotoList.find(
                (item) => item.komponen_id === output.id && item.penerima_id === penerima.id && normalizeSlotLabel(item.keterangan) === slot,
              )
              return { slot, foto }
            })
            matrix.push({
              output,
              slots,
              penerima,
              count: fotoList.filter((item) => item.komponen_id === output.id && item.penerima_id === penerima.id).length,
            })
          })
        }
      }
    })

    return matrix
  }, [fotoList, outputList, penerimaList])

  function resetPenerimaForm() {
    setEditingPenerimaId(null)
    resetPenerimaFormHook(EMPTY_PENERIMA_FORM)
  }

  function resetTiketForm() {
    resetTiketFormHook(EMPTY_TIKET_FORM)
    setTiketAttachment(null)
    if (tiketFileRef.current) {
      tiketFileRef.current.value = ''
    }
  }

  function handleTiketSubmit(values: TiketFormValues) {
    createTiketMutation.mutate({
      pekerjaan_id: pekerjaanId,
      subjek: values.subjek.trim(),
      deskripsi: values.deskripsi.trim(),
      kategori: values.kategori,
      prioritas: values.prioritas,
      attachment: tiketAttachment,
    })
  }

  function resetOutputForm() {
    setEditingOutputId(null)
    setOutputForm({
      komponen: '',
      satuan: '',
      volume: '',
      penerima_is_optional: false,
    })
  }

  function handleEditOutput(output: Output) {
    setEditingOutputId(output.id)
    setOutputForm({
      komponen: output.komponen || '',
      satuan: output.satuan || '',
      volume: String(output.volume || ''),
      penerima_is_optional: Boolean(output.penerima_is_optional),
    })
    setActiveTab('output')
  }

  function handleOutputSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const komponen = outputForm.komponen.trim()
    if (!komponen) return

    const payload: OutputPayload = {
      pekerjaan_id: pekerjaanId,
      komponen,
      penerima_is_optional: outputForm.penerima_is_optional,
    }

    const satuan = outputForm.satuan.trim()
    if (satuan) {
      payload.satuan = satuan
    }

    const volume = outputForm.volume.trim()
    if (volume) {
      payload.volume = volume
    }

    if (editingOutputId) {
      updateOutputMutation.mutate({ id: editingOutputId, input: payload })
    } else {
      createOutputMutation.mutate(payload)
    }
  }

  function handleEditPenerima(penerima: Penerima) {
    setEditingPenerimaId(penerima.id)
    resetPenerimaFormHook({
      nama: penerima.nama || '',
      jumlah_jiwa: stringValue(penerima.jumlah_jiwa),
      nik: penerima.nik || '',
      alamat: penerima.alamat || '',
      is_komunal: Boolean(penerima.is_komunal),
    })
    setPenerimaFormOpen(true)
    setActiveTab('penerima')
  }

  function openUploadTarget(output: Output, slot: string, penerima?: Penerima | undefined) {
    if (penerima !== undefined) {
      setUploadTarget({ output, slot, penerima })
    } else {
      setUploadTarget({ output, slot })
    }
    setUploadFile(null)
    setUploadKoordinat('')
    setExtractionStatus(null)
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  function handleGetLocation() {
    setExtractionStatus('Mendapatkan lokasi dari GPS...')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUploadKoordinat(`${latitude}, ${longitude}`)
          setExtractionStatus('Lokasi berhasil didapatkan dari GPS.')
        },
        (error) => {
          console.error('Error getting location:', error)
          setExtractionStatus('Gagal mendapatkan lokasi dari GPS.')
          alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.')
        }
      )
    } else {
      setExtractionStatus('Browser tidak mendukung geolocation.')
      alert('Browser tidak mendukung geolocation')
    }
  }

  function handlePenerimaSubmit(data: any) {
    const typed: PenerimaFormState = data
    const nama = typed.nama.trim()
    if (!nama) return

    const payload: PenerimaPayload = {
      pekerjaan_id: pekerjaanId,
      nama,
      is_komunal: typed.is_komunal,
    }

    const alamat = typed.alamat.trim()
    if (alamat) {
      payload.alamat = alamat
    }

    if (!typed.is_komunal) {
      const jumlahJiwa = normalizeOptionalNumber(typed.jumlah_jiwa)
      if (jumlahJiwa !== undefined) {
        payload.jumlah_jiwa = jumlahJiwa
      }

      const nik = typed.nik.trim()
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

  const createOutputMutation = useMutation({
    mutationFn: (input: OutputPayload) => createOutput(input),
    onSuccess: async () => {
      resetOutputForm()
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const updateOutputMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: OutputPayload }) => updateOutput(id, input),
    onSuccess: async () => {
      resetOutputForm()
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const deleteOutputMutation = useMutation({
    mutationFn: (outputId: number) => deleteOutput(outputId),
    onSuccess: async () => {
      setDeleteOutputTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const createTiketMutation = useMutation({
    mutationFn: (input: {
      pekerjaan_id: number
      subjek: string
      deskripsi: string
      kategori: string
      prioritas: string
      attachment?: File | null | undefined
    }) => createTiket(input),
    onSuccess: async () => {
      resetTiketForm()
      setTiketFormOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['tiket', 'list', { pekerjaanId }] })
    },
  })

  const uploadFotoMutation = useMutation({
    mutationFn: async (input: { file: File; output: Output; slot: string; penerima?: Penerima | undefined; koordinat: string }) => {
      const formData = new FormData()
      formData.append('pekerjaan_id', String(pekerjaanId))
      formData.append('komponen_id', String(input.output.id))
      formData.append('keterangan', input.slot)
      formData.append('koordinat', input.koordinat || 'manual')
      if (input.penerima) {
        formData.append('penerima_id', String(input.penerima.id))
      }
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
      closePhotoPreview()
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'detail', pekerjaanId] })
    },
  })

  const updateProgressMutation = useMutation({
    mutationFn: () => {
      const items = (progressView?.items ?? []).map((item, index) => {
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
      })
      return updateProgress(pekerjaanId, { items, week_count: maxWeek })
    },
    onSuccess: async () => {
      setEditedProgress({})
      setProgressSaved(true)
      setTimeout(() => setProgressSaved(false), 2000)
      await queryClient.invalidateQueries({ queryKey: ['pekerjaan', 'progress', pekerjaanId] })
    },
  })

  function getProgressCellValue(itemIndex: number, field: 'rencana' | 'realisasi', weekData?: { rencana?: number | null; realisasi?: number | null }) {
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

  function handlePrintPDF() {
    if (!fotoList.length) {
      alert('Tidak ada data untuk dicetak')
      return
    }

    const today = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    const totalPhotos = fotoList.length

    const allPhotos: { foto: Foto; koordinat: string; penerima: string; komponen: string; level: string }[] = []
    
    outputPhotoMatrix.forEach(({ output, slots }) => {
      slots.forEach(({ slot, foto }) => {
        if (foto) {
          allPhotos.push({
            foto,
            koordinat: foto.koordinat || '',
            penerima: output.penerima_is_optional ? 'Komunal' : 'Individual',
            komponen: output.komponen,
            level: slot,
          })
        }
      })
    })

    const matrixFotoIds = new Set(allPhotos.map((p) => p.foto.id))
    fotoList.forEach((foto) => {
      if (!matrixFotoIds.has(foto.id)) {
        allPhotos.push({
          foto,
          koordinat: foto.koordinat || '',
          penerima: '-',
          komponen: foto.komponen?.komponen || 'Lainnya',
          level: foto.keterangan || '-',
        })
      }
    })

    let printHTML = ''

    if (totalPhotos <= 10) {
      let photoPages = ''
      for (let i = 0; i < allPhotos.length; i += 2) {
        const photo1 = allPhotos[i]!
        const photo2 = allPhotos[i + 1]

        let pageContent = `
          <div class="photo-card">
            <img src="${photo1.foto.foto_url}" alt="Foto" onerror="this.style.display='none'" />
            <div class="photo-info">
              <span><strong>Komponen:</strong> ${photo1.komponen}</span>
              ${photo1.penerima ? `<span><strong>Penerima:</strong> ${photo1.penerima}</span>` : ''}
              <span><strong>Progress:</strong> ${photo1.level}</span>
              ${photo1.koordinat ? `<span class="koordinat"><strong>Koordinat:</strong> ${photo1.koordinat}</span>` : ''}
            </div>
          </div>
        `

        if (photo2) {
          pageContent += `
            <div class="photo-card">
              <img src="${photo2.foto.foto_url}" alt="Foto" onerror="this.style.display='none'" />
              <div class="photo-info">
                <span><strong>Komponen:</strong> ${photo2.komponen}</span>
                ${photo2.penerima ? `<span><strong>Penerima:</strong> ${photo2.penerima}</span>` : ''}
                <span><strong>Progress:</strong> ${photo2.level}</span>
                ${photo2.koordinat ? `<span class="koordinat"><strong>Koordinat:</strong> ${photo2.koordinat}</span>` : ''}
              </div>
            </div>
          `
        }
        photoPages += `<div class="page">${pageContent}</div>`
      }

      printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Dokumentasi Foto - ${pekerjaan?.nama_paket || 'Pekerjaan'}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { page-break-after: always; }
              .page:last-child { page-break-after: avoid; }
            }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
            .header { text-align: center; padding: 8px; border-bottom: 2px solid #333; margin-bottom: 10px; }
            .header h2 { margin: 0; font-size: 14px; }
            .page { width: 194mm; padding: 3mm; }
            .photo-card { border: 1px solid #ccc; border-radius: 4px; padding: 8px; margin-bottom: 8px; background: #fafafa; }
            .photo-card img { width: 100%; height: 115mm; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; display: block; }
            .photo-info { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee; font-size: 10px; }
            .koordinat { font-size: 9px; color: #666; }
            .footer { text-align: center; font-size: 8px; color: #666; margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Dokumentasi Foto - ${pekerjaan?.nama_paket || 'Pekerjaan'}</h2>
          </div>
          ${photoPages}
          <div class="footer">Dicetak pada: ${today} | Total: ${totalPhotos} foto</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
        </html>
      `
    } else {
      let tableRows = ''
      outputPhotoMatrix.forEach(({ output, slots }, index) => {
        let photoCells = ''
        slots.forEach(({ foto }) => {
          if (foto) {
            photoCells += `
              <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">
                <div style="margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                  <img src="${foto.foto_url}" style="width: 70px; height: 70px; object-fit: cover;" onerror="this.style.display='none'" />
                  <div style="font-size: 7px; color: #666; margin-top: 2px; word-break: break-all; max-width: 80px;">${foto.koordinat || ''}</div>
                </div>
              </td>
            `
          } else {
            photoCells += `<td style="border: 1px solid #000; padding: 4px; text-align: center; color: #999;">-</td>`
          }
        })

        tableRows += `
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${output.komponen}</td>
            ${photoCells}
          </tr>
        `
      })

      printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Dokumentasi Foto - ${pekerjaan?.nama_paket || 'Pekerjaan'}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 10px; }
            h2 { font-size: 14px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f0f0f0; border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; }
            .footer { margin-top: 15px; font-size: 9px; color: #666; }
          </style>
        </head>
        <body>
          <h2>Dokumentasi Foto - ${pekerjaan?.nama_paket || 'Pekerjaan'}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th style="min-width: 80px;">Komponen</th>
                <th style="width: 90px;">0%</th>
                <th style="width: 90px;">25%</th>
                <th style="width: 90px;">50%</th>
                <th style="width: 90px;">75%</th>
                <th style="width: 90px;">100%</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">Dicetak pada: ${today}</div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
        </html>
      `
    }

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
    } else {
      alert('Popup diblokir. Mohon izinkan popup untuk mencetak.')
    }
  }

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
        <div className="neo-surface auth-card auth-card--loading">
          <Spinner />
          <div>Memuat detail pekerjaan...</div>
        </div>
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

  return (
    <div className="stack stack--page-detail">
      {/* ─── Compact Hero ─── */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <AnchorButton variant="neutral" to="/pekerjaan" className="neo-button--sm neo-shrink-0">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </AnchorButton>
          <h1>{pekerjaan.nama_paket}</h1>
          <div className="detail-hero-badges">
            <Badge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</Badge>
            {pekerjaan.assignment_sources?.map((source, idx) => (
              <Badge key={`${source}-${idx}`} tone="neutral">{source}</Badge>
            ))}
          </div>
        </div>

        <div className="detail-hero-meta">
          <span>{lokasiLabel}</span>
          <span className="detail-sep">•</span>
          <span>{kegiatanLabel}</span>
          <span className="detail-sep">•</span>
          <span>TA {tahunLabel}</span>
          <span className="detail-sep">•</span>
          <span>Pagu <strong>{formatCurrency(pekerjaan.pagu ?? progressView?.pekerjaan?.pagu ?? 0)}</strong></span>
          <span className="detail-sep">•</span>
          <div className="detail-progress-inline">
            <span>Progress</span>
            <div className="detail-progress-track">
              <DetailProgressFill percent={progressValue} />
            </div>
            <strong>{formatPercent(progressValue)}</strong>
          </div>
        </div>

        <div className="detail-hero-personnel">
          <span>Pengawas: <strong>{pengawasLabel}</strong></span>
          <span className="detail-sep">•</span>
          <span>Pendamping: <strong>{pendampingLabel}</strong></span>
          <span className="detail-sep">•</span>
          <span>Dibuat {formatDate(pekerjaan.created_at ?? null)}</span>
        </div>
      </div>

      {/* ─── Sticky Tab Bar ─── */}
      <nav className="detail-tabs-sticky" role="tablist">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className="detail-tab-pill"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ─── Tab: Ringkasan ─── */}
      {activeTab === 'ringkasan' ? (
        <div className="stack stack--compact">
          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Ringkasan pekerjaan</h2>
                <p>Informasi utama, kontrak, dan hubungan data</p>
              </div>
              <div className="detail-status-bar">
                <StatusChip>Foto: <strong>{formatNumber(totalFoto)}</strong></StatusChip>
                <StatusChip>Penerima: <strong>{formatNumber(totalPenerima)}</strong></StatusChip>
                <StatusChip>Output: <strong>{formatNumber(outputList.length)}</strong></StatusChip>
              </div>
            </div>

            <div className="detail-grid detail-grid--auto">
              <DetailRow label="Kegiatan" value={kegiatanLabel} />
              <DetailRow label="Tahun anggaran" value={tahunLabel} />
              <DetailRow label="Lokasi" value={lokasiLabel} />
              <DetailRow label="Pengawas" value={pengawasLabel} />
              <DetailRow label="Pendamping" value={pendampingLabel} />
              <DetailRow label="Nomor rekening" value={stringValue(pekerjaan.kode_rekening)} />
              <DetailRow label="Pagu" value={formatCurrency(pekerjaan.pagu ?? 0)} />
              <DetailRow label="Progress" value={formatPercent(progressValue)} />
              <DetailRow label="Foto wajib" value={stringValue(pekerjaan.foto_required_count)} />
              <DetailRow label="Dibuat" value={formatDate(pekerjaan.created_at ?? null)} />
              <DetailRow label="Diperbarui" value={formatDateTime(pekerjaan.updated_at ?? null)} />
            </div>
          </div>

          {outputList.length ? (
            <div className="detail-section-full">
              <div className="detail-tab-header">
                <div className="detail-tab-header-left">
                  <h2>Output pekerjaan</h2>
                  <p>Daftar output dan ringkasan foto per output</p>
                </div>
              </div>

              <div className="detail-output-grid">
                {outputList.map((output, idx) => {
                  const outputPhotos = fotoList.filter((item) => item.komponen_id === output.id)
                  return (
                    <div key={`output-${output.id}-${idx}`} className="detail-output-card">
                      <div className="detail-output-card-head">
                        <div>
                          <div className="output-title">{output.komponen}</div>
                          <div className="output-meta">
                            {stringValue(output.volume)} {output.satuan || ''}
                          </div>
                        </div>
                        {output.penerima_is_optional ? <Badge tone="info">Opsional</Badge> : <Badge tone="neutral">Wajib</Badge>}
                      </div>
                      <div className="badge-row-inline">
                        <Badge tone="neutral">{formatNumber(outputPhotos.length)} foto</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ─── Tab: Output ─── */}
      {activeTab === 'output' ? (
        <div className="stack stack--compact">
          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>{editingOutputId ? 'Edit output' : 'Tambah output'}</h2>
                <p>Komponen pekerjaan menjadi dasar matriks foto dan progress</p>
              </div>
              <div className="detail-inline-controls">
                {editingOutputId ? (
                  <Button type="button" variant="neutral" size="sm" onClick={resetOutputForm}>
                    Reset form
                  </Button>
                ) : null}
              </div>
            </div>

            <form className="neo-form" onSubmit={handleOutputSubmit}>
              <div className="neo-form-grid">
                <FieldGroup label="Komponen">
                  <select
                    className="neo-input"
                    value={outputForm.komponen}
                    onChange={(event) => setOutputForm((current) => ({ ...current, komponen: event.target.value }))}
                    required
                  >
                    <option value="">Pilih komponen</option>
                    {OUTPUT_KOMPONEN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Satuan">
                  <select
                    className="neo-input"
                    value={outputForm.satuan}
                    onChange={(event) => setOutputForm((current) => ({ ...current, satuan: event.target.value }))}
                  >
                    <option value="">Pilih satuan</option>
                    {OUTPUT_SATUAN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Volume">
                  <Input
                    value={outputForm.volume}
                    onChange={(event) => setOutputForm((current) => ({ ...current, volume: event.target.value }))}
                    placeholder="Volume"
                  />
                </FieldGroup>
              </div>

              <div className="neo-form-row">
                <label className="neo-chip chip-toggle">
                  <input
                    type="checkbox"
                    checked={outputForm.penerima_is_optional}
                    onChange={(event) =>
                      setOutputForm((current) => ({
                        ...current,
                        penerima_is_optional: event.target.checked,
                      }))
                    }
                  />
                  <span>Komponen komunal</span>
                </label>
                <span className="hint-text">Aktifkan untuk output kelompok tanpa penerima individu.</span>
              </div>

              <div className="neo-form-actions">
                <Button type="submit" isLoading={createOutputMutation.isPending || updateOutputMutation.isPending}>
                  {editingOutputId ? 'Simpan perubahan' : 'Tambah output'}
                </Button>
                <Button type="button" variant="neutral" onClick={resetOutputForm}>
                  Batal
                </Button>
              </div>
            </form>
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Daftar output</h2>
                <p>{formatNumber(outputList.length)} output tersimpan</p>
              </div>
            </div>

            {outputList.length ? (
              <div className="table-wrap">
                <table className="neo-table">
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th>Satuan</th>
                      <th>Volume</th>
                      <th>Tipe</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputList.map((output, idx) => (
                      <tr key={`output-${output.id}-${idx}`}>
                        <td>
                          <div className="table-title">{output.komponen}</div>
                        </td>
                        <td>{output.satuan || '-'}</td>
                        <td>{stringValue(output.volume)}</td>
                        <td>
                          <Badge tone={output.penerima_is_optional ? 'info' : 'neutral'}>
                            {output.penerima_is_optional ? 'Komunal' : 'Individu'}
                          </Badge>
                        </td>
                        <td>
                          <div className="badge-row-inline">
                            <Button type="button" variant="neutral" size="sm" onClick={() => handleEditOutput(output)}>
                              <Edit3 size={14} />
                              <span>Edit</span>
                            </Button>
                            <Button type="button" variant="danger" size="sm" onClick={() => setDeleteOutputTarget(output)}>
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
              <EmptyState title="Belum ada output" description="Tambahkan komponen output pertama sebelum mengisi penerima dan foto." />
            )}
          </div>
        </div>
      ) : null}

      {/* ─── Tab: Penerima ─── */}
      {activeTab === 'penerima' ? (
        <div className="stack stack--compact">
          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>{editingPenerimaId ? 'Edit penerima manfaat' : 'Tambah penerima manfaat'}</h2>
                <p>Gunakan mode komunal untuk penerima kelompok</p>
              </div>
              <div className="detail-inline-controls">
                {editingPenerimaId ? (
                  <Button type="button" variant="neutral" size="sm" onClick={resetPenerimaForm}>Reset form</Button>
                ) : null}
                <button
                  type="button"
                  className="detail-penerima-form-toggle"
                  aria-expanded={penerimaFormOpen || Boolean(editingPenerimaId)}
                  onClick={() => {
                    if (editingPenerimaId) return
                    setPenerimaFormOpen((v) => !v)
                  }}
                >
                  <ChevronDown size={16} />
                  <span>{penerimaFormOpen || editingPenerimaId ? 'Tutup form' : 'Buka form'}</span>
                </button>
              </div>
            </div>

            {(penerimaFormOpen || editingPenerimaId) ? (
              <form className="neo-form" onSubmit={handleSubmit(handlePenerimaSubmit)}>
                <div className="neo-form-grid">
                  <FieldGroup label="Nama" error={errors.nama?.message}>
                    <Input {...register('nama')} placeholder="Nama penerima" />
                  </FieldGroup>
                  <FieldGroup label="Jumlah jiwa">
                    <Input
                      type="number"
                      min="0"
                      {...register('jumlah_jiwa')}
                      disabled={isKomunal}
                      placeholder="0"
                    />
                  </FieldGroup>
                  <FieldGroup label="NIK">
                    <Input
                      {...register('nik')}
                      disabled={isKomunal}
                      placeholder="NIK atau nomor identitas"
                    />
                  </FieldGroup>
                </div>

                <div className="neo-form-row">
                  <label className="neo-chip chip-toggle">
                    <input type="checkbox" {...register('is_komunal')} />
                    <span>Komunal</span>
                  </label>
                  <span className="hint-text">Saat komunal aktif, jumlah jiwa dan NIK tidak perlu diisi.</span>
                  {errors.is_komunal ? <span className="field-error">{errors.is_komunal.message}</span> : null}
                </div>

                <FieldGroup label="Alamat">
                  <Textarea
                    rows={2}
                    {...register('alamat')}
                    placeholder="Alamat singkat atau catatan lokasi"
                  />
                </FieldGroup>

                <div className="neo-form-actions">
                  <Button type="submit" isLoading={createPenerimaMutation.isPending || updatePenerimaMutation.isPending}>
                    {editingPenerimaId ? 'Simpan perubahan' : 'Tambah penerima'}
                  </Button>
                  <Button type="button" variant="neutral" onClick={() => { resetPenerimaForm(); setPenerimaFormOpen(false) }}>
                    Batal
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Daftar penerima</h2>
                <p>{formatNumber(totalPenerima)} penerima tersimpan</p>
              </div>
            </div>

            {penerimaList.length ? (
              <div className="table-wrap">
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
                    {penerimaList.map((penerima, idx) => (
                      <tr key={`penerima-${penerima.id}-${idx}`}>
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
                          <div className="badge-row-inline">
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
          </div>
        </div>
      ) : null}

      {/* ─── Tab: Foto ─── */}
      {activeTab === 'foto' ? (
        <div className="stack stack--compact">
          <div className="detail-status-bar">
            <StatusChip>
              Status: <strong><Badge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</Badge></strong>
            </StatusChip>
            <StatusChip>Total foto: <strong>{formatNumber(totalFoto)}</strong></StatusChip>
            <StatusChip>Output: <strong>{formatNumber(outputList.length)}</strong></StatusChip>
            <StatusChip>Foto wajib: <strong>{stringValue(pekerjaan.foto_required_count)}</strong></StatusChip>
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Matriks foto</h2>
                <p>Setiap output memiliki slot 0% / 25% / 50% / 75% / 100%</p>
              </div>
              <div className="detail-inline-controls">
                <Button variant="secondary" size="sm" onClick={handlePrintPDF} disabled={fotoList.length === 0}>
                  <Printer size={14} />
                  <span>Cetak Foto</span>
                </Button>
              </div>
            </div>

            {outputPhotoMatrix.length ? (
              <PhotoMatrix
                entries={outputPhotoMatrix.map((entry) => ({
                  ...entry,
                  showPenerimaWarning:
                    !entry.penerima && !entry.output.penerima_is_optional && penerimaList.length === 0,
                }))}
                formatVolume={(volume, satuan) => (
                  <>
                    {formatNumber(volume)} {satuan}
                  </>
                )}
                onSlotClick={(output, slot, foto, penerima) => {
                  if (foto) {
                    const slotPhotos = fotoList.filter(
                      (f) =>
                        f.komponen_id === output.id &&
                        normalizeSlotLabel(f.keterangan) === slot &&
                        (penerima ? f.penerima_id === penerima.id : !f.penerima_id),
                    )
                    const startIdx = slotPhotos.findIndex((f) => f.id === foto.id)
                    openPhotoPreview(slotPhotos.length ? slotPhotos : [foto], Math.max(0, startIdx))
                  } else {
                    openUploadTarget(output, slot, penerima)
                  }
                }}
                onSlotUpload={(output, slot, penerima) => openUploadTarget(output, slot, penerima)}
              />
            ) : fotoList.length ? (
              <div className="foto-fallback-grid">
                {fotoList.map((foto, idx) => (
                  <button
                    key={`foto-${foto.id}-${idx}`}
                    type="button"
                    className="neo-surface foto-card"
                    onClick={() => {
                      const slot = normalizeSlotLabel(foto.keterangan)
                      const matching = fotoList.filter(
                        (f) =>
                          f.komponen_id === foto.komponen_id &&
                          normalizeSlotLabel(f.keterangan) === slot &&
                          f.penerima_id === foto.penerima_id,
                      )
                      const matchIdx = matching.findIndex((f) => f.id === foto.id)
                      openPhotoPreview(matching.length ? matching : [foto], Math.max(0, matchIdx))
                    }}
                  >
                    <img
                      src={foto.foto_thumb_url || foto.foto_url || ''}
                      alt={foto.keterangan || 'Foto pekerjaan'}
                      className="foto-card-img"
                    />
                    <div className="foto-card-body">
                      <div className="foto-card-title">{foto.keterangan || 'Foto pekerjaan'}</div>
                      <div className="foto-card-meta">{formatDateTime(foto.created_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="Belum ada foto" description="Belum ada dokumentasi yang tersimpan untuk pekerjaan ini." />
            )}
          </div>
        </div>
      ) : null}

      {/* ─── Tab: Progress ─── */}
      {activeTab === 'progress' ? (
        <div className="stack stack--compact">
          {progressQuery.isPending ? (
            <div className="detail-section-full detail-section-loading">
              <Spinner />
              <span>Memuat progress...</span>
            </div>
          ) : progressView ? (
            <>
              <div className="detail-kpi-row">
                <div className={`detail-kpi-card detail-kpi-card--info`}>
                  <div className="detail-kpi-label">Total bobot</div>
                  <div className="detail-kpi-value">{formatPercent(progressView.totals?.total_bobot ?? 0)}</div>
                  <div className="detail-kpi-hint">Akumulasi bobot item</div>
                </div>
                {(() => {
                  const deviasi = progressView.items?.reduce((acc, item) => {
                    const bobot = Number(item.bobot || 0)
                    const target = Number(item.target_volume || 0)
                    if (target <= 0) return acc
                    let itemPlan = 0
                    let itemReal = 0
                    Object.values(item.weekly_data || {}).forEach(d => {
                      itemPlan += Number(d.rencana || 0)
                      itemReal += Number(d.realisasi || 0)
                    })
                    const planPercent = (itemPlan / target) * bobot
                    const realPercent = (itemReal / target) * bobot
                    return acc + (realPercent - planPercent)
                  }, 0) ?? 0

                  return (
                    <div className={`detail-kpi-card detail-kpi-card--${deviasi >= 0 ? 'success' : 'danger'}`}>
                      <div className="detail-kpi-label">Deviasi</div>
                      <div className="detail-kpi-value">
                        {deviasi > 0 ? '+' : ''}{formatPercent(deviasi)}
                      </div>
                      <div className="detail-kpi-hint">Selisih realisasi dengan rencana</div>
                    </div>
                  )
                })()}
                <div className={`detail-kpi-card detail-kpi-card--${progressTone(progressView.totals?.total_weighted_progress ?? 0)}`}>
                  <div className="detail-kpi-label">Progress terhitung</div>
                  <div className="detail-kpi-value">{formatPercent(progressView.totals?.total_weighted_progress ?? 0)}</div>
                  <div className="detail-kpi-hint">Dari komposisi progress</div>
                </div>
                <div className="detail-kpi-card">
                  <div className="detail-kpi-label">Minggu</div>
                  <div className="detail-kpi-value">{formatNumber(progressView.max_minggu ?? 0)}</div>
                  <div className="detail-kpi-hint">Batas waktu tersedia</div>
                </div>
              </div>

              <div className="detail-section-full">
                <div className="detail-tab-header">
                  <div className="detail-tab-header-left">
                    <h2>Rincian per minggu</h2>
                    <p>Isi kolom Rencana dan Realisasi lalu simpan</p>
                  </div>
                  <div className="detail-inline-controls">
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
                      <Badge tone="success"><Check size={12} /> Tersimpan</Badge>
                    ) : null}
                  </div>
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
                        {progressItems.map((item, itemIndex) => {
                          const weekData = item.weekly_data?.[String(activeWeek)]
                          const realisasiVal = getProgressCellValue(itemIndex, 'realisasi', weekData)
                          const realisasiNum = Number(realisasiVal || 0)
                          return (
                            <tr key={`progress-item-${itemIndex}`}>
                              <td>
                                <div className="table-title">{item.nama_item || item.rincian_item || '-'}</div>
                                {item.rincian_item ? <div className="table-subtitle">{item.rincian_item}</div> : null}
                              </td>
                              <td>{item.satuan || '-'}</td>
                              <td>{stringValue(item.target_volume)}</td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="neo-input neo-input--cell"
                                  placeholder="0"
                                  value={getProgressCellValue(itemIndex, 'rencana', weekData)}
                                  onChange={(e) => setProgressCell(itemIndex, 'rencana', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="neo-input neo-input--cell"
                                  placeholder="0"
                                  value={getProgressCellValue(itemIndex, 'realisasi', weekData)}
                                  onChange={(e) => setProgressCell(itemIndex, 'realisasi', e.target.value)}
                                />
                              </td>
                              <td>
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
                  <EmptyState title="Belum ada item progress" description="Progress report belum memiliki detail item." />
                )}
              </div>
            </>
          ) : (
            <EmptyState title="Progress belum tersedia" description="Backend belum mengirim ringkasan progress untuk pekerjaan ini." />
          )}
        </div>
      ) : null}

      {/* ─── Tab: Tiket ─── */}
      {activeTab === 'tiket' ? (
        <div className="stack stack--compact">
          <div className="detail-status-bar">
            <StatusChip>Jumlah: <strong>{formatNumber(tiketList.length)}</strong></StatusChip>
            <StatusChip>
              Terbuka: <strong>{formatNumber(tiketList.filter((item) => `${item.status || 'open'}` !== 'closed').length)}</strong>
            </StatusChip>
            <StatusChip>
              Tertutup: <strong>{formatNumber(tiketList.filter((item) => `${item.status || ''}` === 'closed').length)}</strong>
            </StatusChip>
            <AnchorButton variant="neutral" to="/tiket" className="neo-button--sm status-bar-end">
              Buka halaman tiket
            </AnchorButton>
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Tambah tiket</h2>
                <p>{tiketList.length > 0 ? 'Buat tiket baru untuk pekerjaan ini' : 'Mulai dengan menambahkan tiket pertama'}</p>
              </div>
              <div className="detail-inline-controls">
                <button
                  type="button"
                  className="detail-penerima-form-toggle"
                  aria-expanded={tiketFormOpen}
                  onClick={() => setTiketFormOpen((open) => !open)}
                >
                  <ChevronDown size={16} />
                  <span>{tiketFormOpen ? 'Tutup form' : 'Buka form'}</span>
                </button>
              </div>
            </div>

            {tiketFormOpen ? (
              <form className="neo-form" onSubmit={handleSubmitTiket(handleTiketSubmit)}>
                <div className="neo-form-grid">
                  <FieldGroup label="Subjek" error={tiketErrors.subjek?.message}>
                    <Input {...registerTiket('subjek')} placeholder="Masukkan subjek tiket" />
                  </FieldGroup>
                  <FieldGroup label="Kategori" error={tiketErrors.kategori?.message}>
                    <select className="neo-input" {...registerTiket('kategori')}>
                      {TIKET_KATEGORI_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                  <FieldGroup
                    label="Prioritas"
                    error={tiketErrors.prioritas?.message}
                    hint={
                      tiketKategori === 'lapangan' || tiketKategori === 'bug'
                        ? 'Prioritas disarankan tinggi untuk isu lapangan/bug.'
                        : undefined
                    }
                  >
                    <select className="neo-input" {...registerTiket('prioritas')}>
                      {TIKET_PRIORITAS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>

                <FieldGroup label="Deskripsi" error={tiketErrors.deskripsi?.message}>
                  <Textarea
                    rows={3}
                    {...registerTiket('deskripsi')}
                    placeholder="Jelaskan isu, lokasi kejadian, atau tindakan yang dibutuhkan"
                  />
                </FieldGroup>

                {showTiketAttachment ? (
                  <FieldGroup
                    label={tiketKategori === 'document' ? 'Lampiran dokumen' : 'Foto lapangan'}
                    hint={
                      tiketKategori === 'document'
                        ? 'Unggah bukti dokumen terkait (opsional, maks. 2 MB).'
                        : 'Unggah foto kondisi lapangan (opsional, maks. 2 MB).'
                    }
                  >
                    <input
                      ref={tiketFileRef}
                      type="file"
                      accept="image/*"
                      className="neo-input neo-input--file"
                      onChange={(event) => setTiketAttachment(event.target.files?.[0] ?? null)}
                    />
                    {tiketAttachment ? (
                      <span className="hint-text">File dipilih: {tiketAttachment.name}</span>
                    ) : null}
                  </FieldGroup>
                ) : null}

                <div className="neo-form-actions">
                  <Button type="submit" isLoading={createTiketMutation.isPending}>
                    Buat tiket
                  </Button>
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => {
                      resetTiketForm()
                      setTiketFormOpen(false)
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Tiket pekerjaan</h2>
                <p>Daftar tiket yang terkait dengan pekerjaan ini</p>
              </div>
            </div>

            {tiketQuery.isPending ? (
              <LoadingRow>Memuat tiket...</LoadingRow>
            ) : tiketList.length ? (
              <div className="table-wrap">
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
                    {tiketList.map((tiket, idx) => (
                      <tr key={`tiket-${tiket.id}-${idx}`}>
                        <td>
                          <div className="table-title">{tiket.subjek}</div>
                          <div className="table-subtitle">{tiket.deskripsi || '-'}</div>
                        </td>
                        <td>{tiketKategoriLabel(tiket.kategori)}</td>
                        <td>
                          <Badge tone={tiketPrioritasTone(tiket.prioritas)}>
                            {tiketPrioritasLabel(tiket.prioritas)}
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
          </div>
        </div>
      ) : null}

      {/* ─── Modals ─── */}
      <ConfirmModal
        open={Boolean(deleteOutputTarget)}
        title="Hapus output?"
        description={deleteOutputTarget ? `Output "${deleteOutputTarget.komponen}" akan dihapus dari pekerjaan ini.` : undefined}
        confirmLabel="Hapus"
        confirmTone="danger"
        isLoading={deleteOutputMutation.isPending}
        onCancel={() => setDeleteOutputTarget(null)}
        onConfirm={() => {
          if (deleteOutputTarget) {
            deleteOutputMutation.mutate(deleteOutputTarget.id)
          }
        }}
      />

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

      {currentPreviewFoto ? (
        <div className="upload-modal-backdrop" onClick={closePhotoPreview}>
          <div className="preview-modal-shell" onClick={(e) => e.stopPropagation()}>
            <div className="neo-surface neo-surface--shadow preview-modal-inner">
              <div className="modal-header-row">
                <div>
                  <div className="modal-eyebrow">
                    PREVIEW FOTO {previewPhotos.length > 1 ? `(${previewIndex + 1} / ${previewPhotos.length})` : ''}
                  </div>
                  <div className="modal-title">{currentPreviewFoto.keterangan || 'Foto pekerjaan'}</div>
                  <div className="modal-subcopy">{formatDateTime(currentPreviewFoto.created_at)}</div>
                </div>

                <div className="modal-header-actions">
                  {previewPhotos.length > 1 && (
                    <>
                      <Button type="button" variant="neutral" size="sm" onClick={() => setPreviewIndex((i) => (i - 1 + previewPhotos.length) % previewPhotos.length)}>
                        ←
                      </Button>
                      <Button type="button" variant="neutral" size="sm" onClick={() => setPreviewIndex((i) => (i + 1) % previewPhotos.length)}>
                        →
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="neutral" onClick={closePhotoPreview}>
                    <X size={16} />
                    <span>Tutup</span>
                  </Button>
                </div>
              </div>

              <div className="preview-modal-body">
                <div className="preview-modal-image-wrap">
                  <img
                    src={currentPreviewFoto.foto_url || currentPreviewFoto.foto_thumb_url || ''}
                    alt={currentPreviewFoto.keterangan || 'Preview foto'}
                    className="preview-modal-image"
                  />
                </div>

                <div className="preview-modal-sidebar">
                  <div className="preview-detail-card">
                    <div className="preview-detail-label">Detail</div>
                    <div className="preview-detail-rows">
                      <div>
                        <span className="preview-detail-muted">Output:</span>{' '}
                        <strong>{currentPreviewFoto.komponen?.komponen || stringValue(currentPreviewFoto.komponen_id)}</strong>
                      </div>
                      <div>
                        <span className="preview-detail-muted">Slot:</span> <strong>{currentPreviewFoto.keterangan || '-'}</strong>
                      </div>
                      <div>
                        <span className="preview-detail-muted">Koordinat:</span> <strong>{currentPreviewFoto.koordinat || '-'}</strong>
                      </div>
                      <div>
                        <span className="preview-detail-muted">Validasi:</span>{' '}
                        <span
                          className={cn(
                            'preview-detail-valid',
                            currentPreviewFoto.validasi_koordinat ? 'preview-detail-valid--ok' : 'preview-detail-valid--bad',
                          )}
                        >
                          {currentPreviewFoto.validasi_koordinat ? 'Valid' : 'Belum valid'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="preview-actions">
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() => {
                        const relatedOutput = outputList.find((output) => output.id === currentPreviewFoto.komponen_id)
                        if (relatedOutput) {
                          setUploadTarget({
                            output: relatedOutput,
                            slot: currentPreviewFoto.keterangan || '0%',
                          })
                          setUploadFile(null)
                          closePhotoPreview()
                        }
                      }}
                    >
                      <Upload size={16} />
                      <span>Ganti foto</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setDeleteFotoTarget(currentPreviewFoto)
                        closePhotoPreview()
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Hapus foto</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {uploadTarget ? (
        <div className="upload-modal-backdrop" onClick={() => setUploadTarget(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <div className="neo-surface neo-surface--shadow upload-modal-shell">
              <div className="modal-header-row">
                <div>
                  <div className="modal-eyebrow modal-eyebrow--upload">Upload foto</div>
                  <div className="modal-title">{uploadTarget.output.komponen}</div>
                  <div className="modal-subcopy">
                    Slot {uploadTarget.slot} — {stringValue(uploadTarget.output.volume)} {uploadTarget.output.satuan || ''}
                  </div>
                </div>
                <Button type="button" variant="neutral" onClick={() => setUploadTarget(null)}>
                  <X size={16} />
                </Button>
              </div>

              <div className="upload-modal-content">
                <div className="neo-surface neo-surface--highlight">
                  <div className="upload-section-title">Koordinat GPS</div>
                  <div className="upload-gps-row">
                    <input
                      type="text"
                      className="neo-input neo-input--flex"
                      placeholder="-6.123456, 106.123456"
                      value={uploadKoordinat}
                      onChange={(e) => setUploadKoordinat(e.target.value)}
                    />
                    <Button type="button" variant="neutral" onClick={handleGetLocation}>
                      <MapPin size={16} className="map-pin-icon" />
                      GPS
                    </Button>
                  </div>
                  {extractionStatus ? <div className="upload-status">{extractionStatus}</div> : null}
                </div>

                <div className="neo-surface neo-surface--highlight">
                  <div className="upload-section-title">Pilih file foto</div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="neo-input neo-input--file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setUploadFile(file)
                      if (!file) {
                        setExtractionStatus(null)
                      }
                    }}
                  />
                  <div className="upload-hint">
                    Foto akan dikirim ke backend dengan konteks output dan slot yang dipilih.
                  </div>
                </div>

                <div className="neo-form-actions">
                  <Button
                    type="button"
                    isLoading={uploadFotoMutation.isPending}
                    disabled={!uploadFile}
                    onClick={() => {
                      if (!uploadFile) return
                      const mutationInput: { file: File; output: Output; slot: string; penerima?: Penerima | undefined; koordinat: string } = {
                        file: uploadFile,
                        output: uploadTarget.output,
                        slot: uploadTarget.slot,
                        koordinat: uploadKoordinat,
                      }
                      if (uploadTarget.penerima) {
                        mutationInput.penerima = uploadTarget.penerima
                      }
                      uploadFotoMutation.mutate(mutationInput)
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
            </div>
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

function tiketPrioritasTone(prioritas?: string | null): MetricTone {
  if (prioritas === 'high' || prioritas === 'tinggi') return 'danger'
  if (prioritas === 'medium' || prioritas === 'sedang') return 'warning'
  return 'neutral'
}

function tiketPrioritasLabel(prioritas?: string | null) {
  const labels: Record<string, string> = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    rendah: 'Rendah',
    sedang: 'Sedang',
    tinggi: 'Tinggi',
  }
  return labels[prioritas || ''] || prioritas || '-'
}

function tiketKategoriLabel(kategori?: string | null) {
  const labels: Record<string, string> = {
    bug: 'Bug',
    request: 'Request',
    lapangan: 'Lapangan',
    document: 'Dokumen',
    other: 'Umum',
  }
  return labels[kategori || ''] || kategori || '-'
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

type OutputPayload = {
  pekerjaan_id: number
  komponen: string
  satuan?: string
  volume?: number | string | null
  penerima_is_optional?: boolean
}

export {}
