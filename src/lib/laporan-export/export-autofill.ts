/**
 * Autofill data Pengaturan Export Laporan dari:
 * - DPA: pengaturan aplikasi (kontrak_nomor_dpa / kontrak_tanggal_dpa)
 * - Mengetahui: PPTK sub kegiatan (fallback PPTK pengaturan)
 * - Diperiksa: pengawas paket
 * - Penyedia: data penyedia kontrak
 */

import type { ProgressReportData } from './types'
import type { DpaData, SignatureData } from './signature'
import { defaultDpaData, defaultSignatureData } from './signature'
import { getTanggalLaporanOtomatis, resolveKontrakStartDate } from './date-helpers'

/** v2: lokasi tanda tangan = Cianjur (bukan desa); tanggal = akhir minggu */
export const EXPORT_SETTINGS_STORAGE_KEY = 'pengawas-buat-laporan-export-settings-v2'

export type AppSettingLike = {
  key: string
  value?: string | null
}

export type ExportSettingsPersisted = {
  signatureOverrides?: Partial<SignatureData>
  dpaOverrides?: Partial<DpaData>
  updatedAt?: string
}

export function loadExportSettingsOverrides(): ExportSettingsPersisted {
  try {
    const raw = localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ExportSettingsPersisted
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveExportSettingsOverrides(data: ExportSettingsPersisted): void {
  try {
    localStorage.setItem(
      EXPORT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // ignore quota
  }
}

function trimOrEmpty(value: unknown): string {
  return String(value ?? '').trim()
}

export function getSettingValue(settings: AppSettingLike[] | undefined, key: string): string {
  if (!settings) return ''
  const setting = settings.find((s) => s.key === key)
  return setting?.value || ''
}

export function formatLaporanTanggal(date = new Date()): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export type ExportAutofillWeekOpts = {
  weekNumber?: number
  throughWeek?: number
}

export function buildExportAutofill(
  report: ProgressReportData | null | undefined,
  settings: AppSettingLike[] | undefined,
  overrides?: ExportSettingsPersisted,
  weekOpts?: ExportAutofillWeekOpts,
): { signatureData: SignatureData; dpaData: DpaData; sources: Record<string, string> } {
  const settingsPptkNama = getSettingValue(settings, 'kontrak_nama_pptk')
  const settingsPptkNip = getSettingValue(settings, 'kontrak_nip_pptk')
  const settingsSkpd = getSettingValue(settings, 'kontrak_skpd')
  const settingsNomorDpa = getSettingValue(settings, 'kontrak_nomor_dpa')
  const settingsTanggalDpa = getSettingValue(settings, 'kontrak_tanggal_dpa')

  const kegiatanPptkNama = trimOrEmpty(report?.kegiatan?.nama_pptk)
  const kegiatanPptkNip = trimOrEmpty(report?.kegiatan?.nip_pptk)

  const pptkNama = kegiatanPptkNama || settingsPptkNama
  const pptkNip = kegiatanPptkNip || settingsPptkNip
  const pptkSource = kegiatanPptkNama
    ? 'PPTK sub kegiatan'
    : settingsPptkNama
      ? 'Pengaturan (fallback PPTK)'
      : '—'

  const pengawas = report?.pengawas
  const penyedia = report?.penyedia

  const weekNumber = Math.max(1, weekOpts?.weekNumber ?? 1)
  const throughWeek = weekOpts?.throughWeek
  const tglMulaiKontrak = resolveKontrakStartDate(report?.kontrak)
  const tanggalOtomatis = getTanggalLaporanOtomatis(
    tglMulaiKontrak,
    throughWeek !== undefined
      ? { weekNumber, throughWeek }
      : { weekNumber },
  )
  const tanggalSource = tglMulaiKontrak
    ? throughWeek && throughWeek > weekNumber
      ? `Akhir minggu ke-${throughWeek} (mulai kontrak)`
      : `Akhir minggu ke-${weekNumber} (mulai kontrak)`
    : 'Hari ini (tanggal mulai kontrak belum ada)'

  const signatureData: SignatureData = {
    ...defaultSignatureData,
    namaMengetahui: pptkNama || defaultSignatureData.namaMengetahui,
    nipMengetahui: pptkNip || defaultSignatureData.nipMengetahui,
    jabatanMengetahui: 'Pejabat Pelaksana Teknis Kegiatan',
    instansiMengetahui: settingsSkpd || defaultSignatureData.instansiMengetahui,
    namaDiperiksa: trimOrEmpty(pengawas?.nama) || defaultSignatureData.namaDiperiksa,
    nipDiperiksa: trimOrEmpty(pengawas?.nip) || defaultSignatureData.nipDiperiksa,
    jabatanDiperiksa:
      trimOrEmpty(pengawas?.jabatan) || defaultSignatureData.jabatanDiperiksa,
    namaPerusahaan: trimOrEmpty(penyedia?.nama) || defaultSignatureData.namaPerusahaan,
    namaDirektur: trimOrEmpty(penyedia?.direktur) || defaultSignatureData.namaDirektur,
    // Tempat tanda tangan = kota kab. (bukan desa lokasi pekerjaan)
    lokasi: defaultSignatureData.lokasi,
    tanggal: tanggalOtomatis,
  }

  const dpaData: DpaData = {
    nomorDpa: settingsNomorDpa || defaultDpaData.nomorDpa,
    tanggalDpa: settingsTanggalDpa || defaultDpaData.tanggalDpa,
  }

  const sigOver = overrides?.signatureOverrides ?? {}
  for (const [key, value] of Object.entries(sigOver) as [keyof SignatureData, string][]) {
    if (trimOrEmpty(value)) {
      signatureData[key] = String(value)
    }
  }
  const dpaOver = overrides?.dpaOverrides ?? {}
  for (const [key, value] of Object.entries(dpaOver) as [keyof DpaData, string][]) {
    if (trimOrEmpty(value)) {
      dpaData[key] = String(value)
    }
  }

  return {
    signatureData,
    dpaData,
    sources: {
      dpa: settingsNomorDpa || settingsTanggalDpa ? 'Pengaturan aplikasi' : '—',
      mengetahui: pptkSource,
      diperiksa: pengawas?.nama ? 'Pengawas paket' : '—',
      penyedia: penyedia?.nama ? 'Penyedia kontrak' : '—',
      tanggalLaporan: tanggalSource,
    },
  }
}

export function sanitizeExportFilePart(value: string): string {
  return (
    value
      .replace(/[^\w\s\-À-ÿ]+/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 48) || 'progress'
  )
}

export function buildLaporanFileName(
  paketName: string,
  weekLabel: string,
  ext: 'pdf' | 'xlsx',
  date = new Date(),
): string {
  const d = date.toISOString().slice(0, 10)
  return `Laporan_Mingguan_${sanitizeExportFilePart(paketName)}_${sanitizeExportFilePart(weekLabel)}_${d}.${ext}`
}
