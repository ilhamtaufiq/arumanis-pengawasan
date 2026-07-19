import type { ProgressItem, ProgressReportView } from '@/lib/types'
import type { ProgressItemData, ProgressReportData } from './types'

function toNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

function mapWeekly(
  weekly: ProgressItem['weekly_data'],
): ProgressItemData['weekly_data'] {
  const out: ProgressItemData['weekly_data'] = {}
  if (!weekly) return out
  for (const [key, cell] of Object.entries(weekly)) {
    out[key] = {
      rencana: cell?.rencana ?? 0,
      realisasi: cell?.realisasi ?? null,
    }
    // also set numeric key for generators that index with numbers
    const n = Number(key)
    if (Number.isFinite(n)) {
      out[n] = out[key]
    }
  }
  return out
}

export function mapProgressItemsForExport(items: ProgressItem[]): ProgressItemData[] {
  return items.map((item, index) => ({
    id: index + 1,
    nama_item: item.nama_item || 'Tanpa Kategori',
    rincian_item: item.rincian_item ?? null,
    satuan: item.satuan || '-',
    harga_satuan: toNum(item.harga_satuan),
    bobot: toNum(item.bobot),
    target_volume: toNum(item.target_volume),
    weekly_data: mapWeekly(item.weekly_data),
  }))
}

/**
 * Map ProgressReportView (API pengawas) → ProgressReportData (generator PDF/Excel).
 */
export function mapProgressReportForExport(
  view: ProgressReportView | null | undefined,
  itemsOverride?: ProgressItem[],
): ProgressReportData | null {
  if (!view?.pekerjaan) return null

  const rawItems = itemsOverride ?? view.items ?? []
  const items = mapProgressItemsForExport(rawItems)

  const viewAny = view as ProgressReportView & {
    pengawas?: { nama?: string | null; nip?: string | null; jabatan?: string | null } | null
    kegiatan?: ProgressReportView['kegiatan'] & {
      nama_pptk?: string | null
      nip_pptk?: string | null
    }
  }

  const pekerjaan: ProgressReportData['pekerjaan'] = {
    id: Number(view.pekerjaan.id ?? 0),
    nama: String(view.pekerjaan.nama ?? '-'),
    pagu: toNum(view.pekerjaan.pagu),
  }
  if (view.pekerjaan.lokasi) pekerjaan.lokasi = view.pekerjaan.lokasi
  if (view.pekerjaan.desa_nama) pekerjaan.desa_nama = view.pekerjaan.desa_nama
  if (view.pekerjaan.kecamatan_nama) {
    pekerjaan.kecamatan_nama = view.pekerjaan.kecamatan_nama
  }

  return {
    pekerjaan,
    kegiatan: view.kegiatan
      ? {
          nama_kegiatan: String(view.kegiatan.nama_kegiatan ?? '-'),
          nama_sub_kegiatan: String(view.kegiatan.nama_sub_kegiatan ?? '-'),
          sumber_dana: String(view.kegiatan.sumber_dana ?? '-'),
          tahun_anggaran: toNum(view.kegiatan.tahun_anggaran) || new Date().getFullYear(),
          nama_pptk: viewAny.kegiatan?.nama_pptk ?? null,
          nip_pptk: viewAny.kegiatan?.nip_pptk ?? null,
        }
      : null,
    kontrak: view.kontrak
      ? {
          tgl_spmk: view.kontrak.tgl_spmk ?? null,
          tgl_spk: view.kontrak.tgl_spk ?? null,
          tgl_selesai: view.kontrak.tgl_selesai ?? null,
          spk: view.kontrak.spk ?? null,
          spmk: view.kontrak.spmk ?? null,
          nilai_kontrak: view.kontrak.nilai_kontrak ?? null,
        }
      : null,
    penyedia: view.penyedia
      ? {
          nama: String(view.penyedia.nama ?? '-'),
          direktur: String(view.penyedia.direktur ?? '-'),
        }
      : null,
    pengawas: viewAny.pengawas
      ? {
          nama: String(viewAny.pengawas.nama ?? '-'),
          nip: viewAny.pengawas.nip ?? null,
          jabatan: viewAny.pengawas.jabatan ?? null,
        }
      : null,
    items,
    totals: {
      total_bobot: toNum(view.totals?.total_bobot),
      total_accumulated_real: toNum(view.totals?.total_accumulated_real),
      total_weighted_progress: toNum(view.totals?.total_weighted_progress),
    },
    max_minggu: Math.max(1, toNum(view.max_minggu) || 1),
  }
}
