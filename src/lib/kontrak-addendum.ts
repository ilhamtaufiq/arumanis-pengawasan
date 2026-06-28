import type { KontrakAddendumAttachmentType, KontrakAddendumPayload } from '@/lib/types'

export const KONTRAK_ADDENDUM_ATTACHMENT_TYPES: Record<KontrakAddendumAttachmentType, string> = {
  surat_permohonan: 'Surat Permohonan',
  surat_undangan_pembahasan: 'Surat Undangan Pembahasan',
  risalah_rapat_pembahasan: 'Risalah Rapat Pembahasan',
  surat_perintah_pelaksanaan_kerja_sesuai_addendum: 'Surat Perintah Pelaksanaan Kerja Sesuai Addendum',
  cco: 'CCO',
  laporan_pekerjaan: 'Laporan Pekerjaan',
  berita_acara: 'Berita Acara',
  sk_peneliti_kontrak: 'SK Peneliti Kontrak',
}

export const KONTRAK_ADDENDUM_JENIS_OPTIONS = [
  { value: 'teknis', label: 'Teknis' },
  { value: 'biaya', label: 'Biaya' },
  { value: 'waktu', label: 'Waktu' },
  { value: 'teknis_biaya', label: 'Teknis & Biaya' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

export function buildKontrakAddendumFormData(
  payload: KontrakAddendumPayload,
  attachments: Partial<Record<KontrakAddendumAttachmentType, File | null | undefined>>,
) {
  const formData = new FormData()

  formData.append('addendum_ke', String(payload.addendum_ke))
  formData.append('tanggal_addendum', payload.tanggal_addendum)
  formData.append('jenis_addendum', payload.jenis_addendum)

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

  for (const [type, file] of Object.entries(attachments) as Array<[KontrakAddendumAttachmentType, File | null | undefined]>) {
    if (file) {
      formData.append(`attachments[${type}]`, file)
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