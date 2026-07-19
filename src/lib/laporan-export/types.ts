export type WeeklyProgressCell = {
  rencana?: number | null
  realisasi?: number | null
}

export type ProgressItemData = {
  id?: number
  nama_item: string
  rincian_item: string | null
  satuan: string
  harga_satuan: number
  bobot: number
  target_volume: number
  weekly_data: Record<string | number, WeeklyProgressCell>
}

export type ProgressReportData = {
  pekerjaan: {
    id: number
    nama: string
    pagu: number
    lokasi?: string
    desa_nama?: string
    kecamatan_nama?: string
  }
  kegiatan?: {
    nama_kegiatan: string
    nama_sub_kegiatan: string
    sumber_dana: string
    tahun_anggaran: number
    nama_pptk?: string | null
    nip_pptk?: string | null
  } | null
  kontrak?: {
    tgl_spmk: string | null
    tgl_spk: string | null
    tgl_selesai: string | null
    spk: string | null
    spmk: string | null
    nilai_kontrak: number | null
  } | null
  penyedia?: {
    nama: string
    direktur: string
  } | null
  pengawas?: {
    nama: string
    nip?: string | null
    jabatan?: string | null
  } | null
  items: ProgressItemData[]
  totals: {
    total_bobot: number
    total_accumulated_real: number
    total_weighted_progress: number
  }
  max_minggu: number
}
