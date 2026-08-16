import type {
  KontrakAddendum,
  KontrakAddendumAttachmentType,
  KontrakAddendumPayload,
  KontrakAddendumRegisterGap,
} from '@/lib/types'

export const ADDENDUM_REGISTER_GAP_HEADLINE =
  'Nomor register addendum sudah dibuat, tetapi detail pengajuan belum ada dan belum disetujui.'

export function getRegisterGapStatusLines(gap: KontrakAddendumRegisterGap) {
  return [
    { label: 'Nomor register', value: gap.nomor_register, done: true },
    { label: 'Detail addendum', value: 'Belum ada — data pengajuan, lampiran, dan nilai belum diisi', done: false },
    { label: 'Persetujuan', value: 'Belum disetujui — pengajuan addendum belum tercatat/disetujui', done: false },
  ]
}

export const KONTRAK_ADDENDUM_ATTACHMENT_TYPES: Record<KontrakAddendumAttachmentType, string> = {
  cco: 'CCO',
  dokumen_nego_addendum: 'Dokumen Nego Addendum',
  surat_permohonan_pembahasan: 'Surat Permohonan Pembahasan Adendum (Penyedia)',
  surat_undangan_pembahasan: 'Surat Undangan Pembahasan (PPK)',
  berita_acara_negosiasi_harga: 'Berita Acara Negosiasi Harga Item Pekerjaan Baru',
  risalah_rapat_pembahasan: 'Risalah Rapat Pembahasan Adendum',
  berita_acara_penelitian: 'Berita Acara Penelitian',
  ba_cco_addendum: 'BA CCO & Adendum Kontrak',
  surat_perintah_pelaksanaan: 'Surat Perintah Pelaksanaan (PPK)',
}

export const KONTRAK_ADDENDUM_JENIS_OPTIONS = [
  { value: 'teknis', label: 'Teknis' },
  { value: 'biaya', label: 'Biaya' },
  { value: 'waktu', label: 'Waktu' },
  { value: 'teknis_biaya', label: 'Teknis & Biaya' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

export type AddendumAttachmentInput = {
  file: File | null
  nomor: string
  tanggal: string
}

export function buildKontrakAddendumFormData(
  payload: KontrakAddendumPayload,
  attachments: Partial<Record<KontrakAddendumAttachmentType, AddendumAttachmentInput>>,
) {
  const formData = new FormData()

  formData.append('addendum_ke', String(payload.addendum_ke))
  formData.append('tanggal_addendum', payload.tanggal_addendum)
  formData.append('jenis_addendum', payload.jenis_addendum)
  if (payload.nomor_addendum) formData.append('nomor_addendum', payload.nomor_addendum)

  if (payload.alasan) formData.append('alasan', payload.alasan)
  if (payload.deskripsi_perubahan) formData.append('deskripsi_perubahan', payload.deskripsi_perubahan)
  if (payload.nilai_kontrak_sebelum != null) {
    formData.append('nilai_kontrak_sebelum', String(payload.nilai_kontrak_sebelum))
  }
  if (payload.nilai_kontrak_sesudah != null) {
    formData.append('nilai_kontrak_sesudah', String(payload.nilai_kontrak_sesudah))
  }
  if (payload.tgl_selesai_sebelum) formData.append('tgl_selesai_sebelum', payload.tgl_selesai_sebelum)
  if (payload.tgl_selesai_sesudah) formData.append('tgl_selesai_sesudah', payload.tgl_selesai_sesudah)

  for (const [type, input] of Object.entries(attachments) as Array<[KontrakAddendumAttachmentType, AddendumAttachmentInput]>) {
    if (input?.file) {
      formData.append(`attachments[${type}]`, input.file)
      if (input.nomor) formData.append(`attachment_nomor[${type}]`, input.nomor)
      if (input.tanggal) formData.append(`attachment_tanggal[${type}]`, input.tanggal)
    }
  }

  return formData
}

export function getMissingAttachmentLabels(
  attachments: Partial<Record<KontrakAddendumAttachmentType, File | null | undefined>>,
) {
  return (Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[])
    .filter((type) => !attachments[type])
    .map((type) => KONTRAK_ADDENDUM_ATTACHMENT_TYPES[type])
}

export function getAddendumMissingAttachmentLabels(addendum: KontrakAddendum) {
  const uploadedTypes = new Set(
    (addendum.attachments ?? [])
      .map((attachment) => attachment.document_type)
      .filter((type): type is KontrakAddendumAttachmentType => Boolean(type)),
  )

  return (Object.keys(KONTRAK_ADDENDUM_ATTACHMENT_TYPES) as KontrakAddendumAttachmentType[])
    .filter((type) => !uploadedTypes.has(type))
    .map((type) => KONTRAK_ADDENDUM_ATTACHMENT_TYPES[type])
}

export function isAddendumIncomplete(addendum: KontrakAddendum) {
  if (!['draft', 'ditolak'].includes(addendum.status)) {
    return false
  }

  return getAddendumMissingAttachmentLabels(addendum).length > 0
}