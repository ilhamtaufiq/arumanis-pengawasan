import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
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
  ConfirmModal,
  EmptyState,
  Input,
  Label,
  Spinner,
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

type UploadTarget = {
  output: Output
  slot: string
  penerima?: Penerima | undefined
}

type MetricTone = 'neutral' | 'warning' | 'danger' | 'success' | 'info'

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
  const [uploadKoordinat, setUploadKoordinat] = useState('')
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null)
  const [editingPenerimaId, setEditingPenerimaId] = useState<number | null>(null)
  const [penerimaForm, setPenerimaForm] = useState<PenerimaFormState>(EMPTY_PENERIMA_FORM)
  const [editedProgress, setEditedProgress] = useState<Record<string, { rencana?: string; realisasi?: string }>>({})
  const [progressSaved, setProgressSaved] = useState(false)
  const [editingOutputId, setEditingOutputId] = useState<number | null>(null)
  const [outputForm, setOutputForm] = useState<{ komponen: string; satuan: string; volume: string; penerima_is_optional: boolean }>({
    komponen: '',
    satuan: '',
    volume: '',
    penerima_is_optional: false,
  })
  const [deleteOutputTarget, setDeleteOutputTarget] = useState<Output | null>(null)
  const [tiketForm, setTiketForm] = useState<{ subjek: string; deskripsi: string; kategori: string; prioritas: string }>({
    subjek: '',
    deskripsi: '',
    kategori: 'other',
    prioritas: 'medium',
  })

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
    setPenerimaForm(EMPTY_PENERIMA_FORM)
  }

  function resetOutputForm() {
    setEditingOutputId(null)
    setOutputForm({ komponen: '', satuan: '', volume: '', penerima_is_optional: false })
  }

  function handleEditOutput(output: Output) {
    setEditingOutputId(output.id)
    setOutputForm({
      komponen: output.komponen || '',
      satuan: output.satuan || '',
      volume: String(output.volume || ''),
      penerima_is_optional: Boolean(output.penerima_is_optional),
    })
    setOutputFormOpen(true)
    setActiveTab('output')
  }

  function handleOutputSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const komponen = outputForm.komponen.trim()
    if (!komponen) return

    const payload: OutputPayload = {
      pekerjaan_id: pekerjaanId,
      komponen,
      satuan: outputForm.satuan.trim() || undefined,
      volume: outputForm.volume.trim() || undefined,
      penerima_is_optional: outputForm.penerima_is_optional,
    }

    if (editingOutputId) {
      updateOutputMutation.mutate({ id: editingOutputId, input: payload })
    } else {
      createOutputMutation.mutate(payload)
    }
  }

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
    mutationFn: (input: { pekerjaan_id: number; subjek: string; deskripsi: string; kategori: string; prioritas: string }) => createTiket(input),
    onSuccess: async () => {
      setTiketForm({ subjek: '', deskripsi: '', kategori: 'other', prioritas: 'medium' })
      await queryClient.invalidateQueries({ queryKey: ['tiket', 'list', { pekerjaanId }] })
    },
  })

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
      setPreviewFoto(null)
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
        <div className="auth-card auth-card--loading" style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
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
    <div className="stack" style={{ gap: '14px', paddingBottom: '2rem' }}>
      {/* ─── Compact Hero ─── */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <AnchorButton variant="neutral" to="/pekerjaan" className="neo-button--sm" style={{ flexShrink: 0 }}>
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
              <div className="detail-progress-fill" style={{ width: `${Math.min(100, progressValue)}%` }} />
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
        <div className="stack" style={{ gap: '14px' }}>
          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Ringkasan pekerjaan</h2>
                <p>Informasi utama, kontrak, dan hubungan data</p>
              </div>
              <div className="detail-status-bar">
                <div className="detail-status-chip">Foto: <strong>{formatNumber(totalFoto)}</strong></div>
                <div className="detail-status-chip">Penerima: <strong>{formatNumber(totalPenerima)}</strong></div>
                <div className="detail-status-chip">Output: <strong>{formatNumber(outputList.length)}</strong></div>
              </div>
            </div>

            <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
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
                          <div style={{ fontWeight: 900 }}>{output.komponen}</div>
                          <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            {stringValue(output.volume)} {output.satuan || ''}
                          </div>
                        </div>
                        {output.penerima_is_optional ? <Badge tone="info">Opsional</Badge> : <Badge tone="neutral">Wajib</Badge>}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
        <div className="stack" style={{ gap: '14px' }}>
          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>{editingOutputId ? 'Edit output' : 'Tambah output'}</h2>
                <p>Daftar komponen output pekerjaan</p>
              </div>
              <div className="detail-inline-controls">
                {editingOutputId ? (
                  <Button type="button" variant="neutral" size="sm" onClick={resetOutputForm}>Reset form</Button>
                ) : null}
              </div>
            </div>

            <form className="space-y-5" style={{ display: 'grid', gap: '16px' }} onSubmit={handleOutputSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  <Field label="Komponen">
                    <select
                      className="neo-input"
                      value={outputForm.komponen}
                      onChange={(event) => setOutputForm((current) => ({ ...current, komponen: event.target.value }))}
                      required
                    >
                      <option value="">Pilih komponen</option>
                      <option value="Sambungan Rumah">Sambungan Rumah</option>
                      <option value="MCK">MCK</option>
                      <option value="MCK Individu">MCK Individu</option>
                      <option value="MCK Komunal">MCK Komunal</option>
                      <option value="Pipa">Pipa</option>
                      <option value="Broncaptering">Broncaptering</option>
                      <option value="Reservoir">Reservoir</option>
                      <option value="Tangki Septik Individu">Tangki Septik Individu</option>
                      <option value="Tangki Septik Komunal">Tangki Septik Komunal</option>
                      <option value="Sumur Bor">Sumur Bor</option>
                      <option value="Pompa">Pompa</option>
                    </select>
                  </Field>
                  <Field label="Satuan">
                    <select
                      className="neo-input"
                      value={outputForm.satuan}
                      onChange={(event) => setOutputForm((current) => ({ ...current, satuan: event.target.value }))}
                    >
                      <option value="">Pilih satuan</option>
                      <option value="Unit">Unit</option>
                      <option value="Meter">Meter</option>
                      <option value="Meter Persegi">Meter Persegi</option>
                      <option value="Meter Kubik">Meter Kubik</option>
                    </select>
                  </Field>
                  <Field label="Volume">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={outputForm.volume}
                      onChange={(event) => setOutputForm((current) => ({ ...current, volume: event.target.value }))}
                      placeholder="Volume"
                    />
                  </Field>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, border: '2px solid var(--border)', borderRadius: '999px', background: '#fff', padding: '6px 12px' }}>
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
                    <span>Komponen Komunal</span>
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                      <th>Dibuat</th>
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
                            {output.penerima_is_optional ? 'Komunal' : 'Individual'}
                          </Badge>
                        </td>
                        <td>{formatDateTime(output.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
              <EmptyState title="Belum ada output" description="Tambahkan komponen output pertama untuk pekerjaan ini." />
            )}
          </div>
        </div>
      ) : null}

      {/* ─── Tab: Penerima ─── */}
      {activeTab === 'penerima' ? (
        <div className="stack" style={{ gap: '14px' }}>
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
              </div>
            </div>

            <form className="space-y-5" style={{ display: 'grid', gap: '16px' }} onSubmit={handlePenerimaSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
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

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, border: '2px solid var(--border)', borderRadius: '999px', background: '#fff', padding: '6px 12px' }}>
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
                  <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    Saat komunal aktif, jumlah jiwa dan NIK tidak perlu diisi.
                  </span>
                </div>

                <Field label="Alamat">
                  <Textarea
                    rows={2}
                    value={penerimaForm.alamat}
                    onChange={(event) => setPenerimaForm((current) => ({ ...current, alamat: event.target.value }))}
                    placeholder="Alamat singkat atau catatan lokasi"
                  />
                </Field>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <Button type="submit" isLoading={createPenerimaMutation.isPending || updatePenerimaMutation.isPending}>
                    {editingPenerimaId ? 'Simpan perubahan' : 'Tambah penerima'}
                  </Button>
                  <Button type="button" variant="neutral" onClick={() => { resetPenerimaForm() }}>
                    Batal
                  </Button>
                </div>
              </form>
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
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
        <div className="stack" style={{ gap: '14px' }}>
          <div className="detail-status-bar">
            <div className="detail-status-chip">
              Status: <strong><Badge tone={statusFotoTone(statusFoto)}>{statusFotoText(statusFoto)}</Badge></strong>
            </div>
            <div className="detail-status-chip">Total foto: <strong>{formatNumber(totalFoto)}</strong></div>
            <div className="detail-status-chip">Output: <strong>{formatNumber(outputList.length)}</strong></div>
            <div className="detail-status-chip">Foto wajib: <strong>{stringValue(pekerjaan.foto_required_count)}</strong></div>
          </div>

          {outputList.length === 0 ? (
            <div className="detail-section-full">
              <div className="detail-tab-header">
                <div className="detail-tab-header-left">
                  <h2>Matriks foto</h2>
                  <p>Setiap output memiliki slot 0% / 25% / 50% / 75% / 100%</p>
                </div>
              </div>
              <EmptyState
                title="Belum ada output"
                description="Tambahkan output terlebih dahulu melalui tab Output sebelum bisa mengupload foto."
              />
            </div>
          ) : (
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
                <div className="stack" style={{ gap: '14px' }}>
                  {outputPhotoMatrix.map(({ output, slots, count, penerima }, idx) => (
                  <div key={`matrix-output-${output.id}-${penerima?.id || '0'}-${idx}`} className="detail-foto-matrix-output">
                    <div className="detail-foto-matrix-head">
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '15px' }}>{output.komponen}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {formatNumber(output.volume)} {output.satuan} • {count} foto diunggah
                        </div>
                        {penerima && (
                          <div style={{ marginTop: '8px', fontSize: '12px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px' }}>
                              <span style={{ fontWeight: 600 }}>Penerima</span><span>: {penerima.nama} {penerima.is_komunal ? '(Komunal)' : ''}</span>
                              {!penerima.is_komunal && (
                                <>
                                  <span style={{ fontWeight: 600 }}>NIK</span><span>: {penerima.nik || '-'}</span>
                                  <span style={{ fontWeight: 600 }}>Jumlah Jiwa</span><span>: {penerima.jumlah_jiwa || '-'}</span>
                                </>
                              )}
                              <span style={{ fontWeight: 600 }}>Alamat</span><span>: {penerima.alamat || '-'}</span>
                            </div>
                          </div>
                        )}
                        {!penerima && !output.penerima_is_optional && penerimaList.length === 0 && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--danger)' }}>
                            Belum ada penerima ditambahkan.
                          </div>
                        )}
                      </div>
                      <Badge tone={output.penerima_is_optional ? 'neutral' : 'warning'}>
                        {output.penerima_is_optional ? 'Komunal' : 'Individual'}
                      </Badge>
                    </div>

                    <div className="detail-foto-slots">
                      {slots.map(({ slot, foto }, sIdx) => (
                        <PhotoSlotCard
                          key={`${output.id}-${penerima?.id || '0'}-${slot}-${sIdx}`}
                          slot={slot}
                          foto={foto}
                          onClick={() => {
                            if (foto) setPreviewFoto(foto)
                            else openUploadTarget(output, slot, penerima)
                          }}
                          onUpload={() => openUploadTarget(output, slot, penerima)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : fotoList.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {fotoList.map((foto, idx) => (
                  <button
                    key={`foto-${foto.id}-${idx}`}
                    type="button"
                    style={{ overflow: 'hidden', border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: '#fff', textAlign: 'left', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                    onClick={() => setPreviewFoto(foto)}
                  >
                    <img
                      src={foto.foto_thumb_url || foto.foto_url || ''}
                      alt={foto.keterangan || 'Foto pekerjaan'}
                      style={{ height: '120px', width: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 900 }}>{foto.keterangan || 'Foto pekerjaan'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{formatDateTime(foto.created_at)}</div>
                    </div>
                  </button>
                ))}
              </div>
              ) : (
                <EmptyState title="Belum ada foto" description="Belum ada dokumentasi yang tersimpan untuk pekerjaan ini." />
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ─── Tab: Progress ─── */}
      {activeTab === 'progress' ? (
        <div className="stack" style={{ gap: '14px' }}>
          {progressQuery.isPending ? (
            <div className="detail-section-full" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
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
                      className="neo-input"
                      style={{ minWidth: '130px', padding: '8px 10px', fontSize: '13px' }}
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
                                  className="neo-input"
                                  style={{ width: '100%', minWidth: '90px', padding: '6px 8px', fontSize: '13px' }}
                                  placeholder="0"
                                  value={getProgressCellValue(itemIndex, 'rencana', weekData)}
                                  onChange={(e) => setProgressCell(itemIndex, 'rencana', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="neo-input"
                                  style={{ width: '100%', minWidth: '90px', padding: '6px 8px', fontSize: '13px' }}
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
        <div className="stack" style={{ gap: '14px' }}>
          <div className="detail-status-bar">
            <div className="detail-status-chip">Jumlah: <strong>{formatNumber(tiketList.length)}</strong></div>
            <div className="detail-status-chip">
              Terbuka: <strong>{formatNumber(tiketList.filter((item) => `${item.status || 'open'}` !== 'closed').length)}</strong>
            </div>
            <div className="detail-status-chip">
              Tertutup: <strong>{formatNumber(tiketList.filter((item) => `${item.status || ''}` === 'closed').length)}</strong>
            </div>
            <AnchorButton variant="neutral" to="/tiket" className="neo-button--sm" style={{ marginLeft: 'auto' }}>
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
              </div>
            </div>

            <form className="space-y-5" style={{ display: 'grid', gap: '16px' }} onSubmit={(event) => {
                event.preventDefault();
                createTiketMutation.mutate({
                  pekerjaan_id: pekerjaanId,
                  subjek: tiketForm.subjek,
                  deskripsi: tiketForm.deskripsi,
                  kategori: tiketForm.kategori,
                  prioritas: tiketForm.prioritas,
                });
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  <Field label="Subjek">
                    <Input
                      value={tiketForm.subjek}
                      onChange={(event) => setTiketForm((current) => ({ ...current, subjek: event.target.value }))}
                      placeholder="Masukan subjek tiket"
                      required
                    />
                  </Field>
                  <Field label="Kategori">
                    <select
                      className="neo-input"
                      value={tiketForm.kategori}
                      onChange={(event) => setTiketForm((current) => ({ ...current, kategori: event.target.value }))}
                    >
                      <option value="other">Umum</option>
                      <option value="bug">Bug</option>
                      <option value="request">Request</option>
                      <option value="lapangan">Lapangan</option>
                      <option value="document">Dokumen</option>
                    </select>
                  </Field>
                  <Field label="Prioritas">
                    <select
                      className="neo-input"
                      value={tiketForm.prioritas}
                      onChange={(event) => setTiketForm((current) => ({ ...current, prioritas: event.target.value }))}
                    >
                      <option value="low">Rendah</option>
                      <option value="medium">Sedang</option>
                      <option value="high">Tinggi</option>
                    </select>
                  </Field>
                </div>

                <Field label="Deskripsi">
                  <Textarea
                    rows={3}
                    value={tiketForm.deskripsi}
                    onChange={(event) => setTiketForm((current) => ({ ...current, deskripsi: event.target.value }))}
                    placeholder="Masukan deskripsi tiket"
                  />
                </Field>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <Button type="submit" isLoading={createTiketMutation.isPending}>
                    {createTiketMutation.isPending ? 'Menyimpan...' : 'Buat Tiket'}
                  </Button>
                  <Button type="button" variant="neutral" onClick={() => setTiketForm({ subjek: '', deskripsi: '', kategori: 'other', prioritas: 'medium' })}>
                    Batal
                  </Button>
                </div>
              </form>
          </div>

          <div className="detail-section-full">
            <div className="detail-tab-header">
              <div className="detail-tab-header-left">
                <h2>Tiket pekerjaan</h2>
                <p>Daftar tiket yang terkait dengan pekerjaan ini</p>
              </div>
            </div>

            {tiketQuery.isPending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted-foreground)' }}>
                <Spinner />
                <span>Memuat tiket...</span>
              </div>
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
          </div>
        </div>
      ) : null}

      {/* ─── Modals ─── */}
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

      {previewFoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '16px' }} onClick={() => setPreviewFoto(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <div style={{ width: 'min(100%, 900px)', border: '3px solid var(--border)', borderRadius: 'var(--radius)', background: '#fff', boxShadow: 'var(--shadow)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted-foreground)' }}>Preview foto</div>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{previewFoto.keterangan || 'Foto pekerjaan'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{formatDateTime(previewFoto.created_at)}</div>
                </div>
                <Button type="button" variant="neutral" onClick={() => setPreviewFoto(null)}>
                  <X size={16} />
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) 280px', gap: '14px', marginTop: '14px' }}>
                <div style={{ overflow: 'hidden', borderRadius: 'var(--radius)', border: '2px solid var(--border)', background: '#000' }}>
                  <img
                    src={previewFoto.foto_url || previewFoto.foto_thumb_url || ''}
                    alt={previewFoto.keterangan || 'Preview foto'}
                    style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', background: '#000', display: 'block' }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '10px', alignContent: 'start' }}>
                  <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: '#fffdf6', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted-foreground)' }}>Detail</div>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                      <DetailRow label="Output" value={previewFoto.komponen?.komponen || stringValue(previewFoto.komponen_id)} />
                      <DetailRow label="Slot" value={previewFoto.keterangan || '-'} />
                      <DetailRow label="Koordinat" value={previewFoto.koordinat || '-'} />
                      <DetailRow label="Validasi" value={previewFoto.validasi_koordinat ? 'Valid' : 'Belum valid'} />
                    </div>
                  </div>

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
          </div>
        </div>
      ) : null}

      {uploadTarget ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '16px' }} onClick={() => setUploadTarget(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <div style={{ width: 'min(100%, 560px)', border: '3px solid var(--border)', borderRadius: 'var(--radius)', background: '#fff', boxShadow: 'var(--shadow)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted-foreground)' }}>Upload foto</div>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{uploadTarget.output.komponen}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                    Slot {uploadTarget.slot} — {stringValue(uploadTarget.output.volume)} {uploadTarget.output.satuan || ''}
                  </div>
                </div>
                <Button type="button" variant="neutral" onClick={() => setUploadTarget(null)}>
                  <X size={16} />
                </Button>
              </div>

              <div style={{ display: 'grid', gap: '14px', marginTop: '14px' }}>
                <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: '#fffdf6', padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>Koordinat GPS</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      className="neo-input"
                      style={{ flex: 1, padding: '8px' }}
                      placeholder="-6.123456, 106.123456"
                      value={uploadKoordinat}
                      onChange={(e) => setUploadKoordinat(e.target.value)}
                    />
                    <Button type="button" variant="neutral" onClick={handleGetLocation}>
                      <MapPin size={16} style={{ marginRight: '4px' }} />
                      GPS
                    </Button>
                  </div>
                  {extractionStatus && (
                    <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '6px', fontWeight: 600 }}>
                      {extractionStatus}
                    </div>
                  )}
                </div>

                <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius)', background: '#fffdf6', padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>Pilih file foto</div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="neo-input"
                    style={{ width: '100%', marginTop: '8px' }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0] ?? null
                      setUploadFile(file)
                      if (file) {
                        setExtractionStatus('Mencoba mengekstrak koordinat dari foto...')
                        try {
                          const coords = await extractCoordinates(file)
                          if (coords) {
                            setUploadKoordinat(coords)
                            setExtractionStatus('Koordinat berhasil diekstrak.')
                          } else {
                            setExtractionStatus('Tidak ada koordinat yang ditemukan pada foto.')
                          }
                        } catch (err) {
                          console.error('Extraction error:', err)
                          setExtractionStatus('Gagal mengekstrak koordinat.')
                        }
                      } else {
                        setExtractionStatus(null)
                      }
                    }}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '6px' }}>
                    Foto akan dikirim ke backend dengan konteks output dan slot yang dipilih.
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', borderBottom: '1px dashed rgba(17,17,17,0.15)', paddingBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{label}</span>
      <strong style={{ textAlign: 'right', fontSize: '13px' }}>{value}</strong>
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
      style={{
        overflow: 'hidden',
        borderRadius: 'var(--radius)',
        border: '2px solid var(--border)',
        background: '#fffdf8',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 0.1s ease',
      }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', background: 'var(--foreground)', padding: '4px 8px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff' }}>
        <span>{slot}</span>
        {foto ? <Badge tone="success">Ada</Badge> : <Badge tone="warning">Kosong</Badge>}
      </div>
      <div style={{ aspectRatio: '4/3', background: 'rgba(0,0,0,0.04)' }}>
        {foto ? (
          <img
            src={foto.foto_thumb_url || foto.foto_url || ''}
            alt={foto.keterangan || slot}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', padding: '8px' }}>
            <Camera size={22} style={{ color: 'rgba(0,0,0,0.3)' }} />
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(0,0,0,0.4)' }}>Kosong</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '6px 8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto?.keterangan || `Slot ${slot}`}</div>
          <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{foto ? formatDateTime(foto.created_at) : 'Klik untuk unggah'}</div>
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
          <Upload size={12} />
        </Button>
      </div>
    </div>
  )
}

export {}
