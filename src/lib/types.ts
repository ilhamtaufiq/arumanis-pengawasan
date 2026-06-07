export type UnknownRecord = Record<string, unknown>

export type ApiEnvelope<T> = {
  data?: T
  message?: string
  success?: boolean
  errors?: Record<string, string[]>
}

export type PaginatedResponse<T> = {
  data: T[]
  links?: UnknownRecord
  meta?: UnknownRecord
}

export type AuthUser = {
  id: number
  name: string
  email: string
  avatar?: string | null
  nip?: string | null
  gender?: string | null
  roles?: Array<{ id?: number; name: string }>
  permissions?: Array<{ id?: number; name: string }>
  [key: string]: unknown
}

export type PengawasStatistics = {
  total_pengawas: number
  total_lokasi: number
  total_pagu: number
}

export type DashboardStats = {
  totalKegiatan: number
  totalPagu: number
  kegiatanPerTahun: Array<{ name: string; value: number }>
  kegiatanPerSumberDana: Array<{ name: string; value: number }>
  paguPerTahun: Array<{ name: string; value: number }>
  availableYears: Array<string | number>
  totalPekerjaan: number
  totalPaguPekerjaan: number
  pekerjaanPerKecamatan: Array<{ name: string; value: number }>
  pekerjaanPerDesa: Array<{ name: string; value: number }>
  paguPekerjaanPerKecamatan: Array<{ name: string; value: number }>
  totalKontrak: number
  totalNilaiKontrak: number
  kontrakPerPenyedia: Array<{ name: string; value: number }>
  nilaiKontrakPerPenyedia: Array<{ name: string; value: number }>
  totalOutput: number
  outputPerSatuan: Array<{ name: string; value: number }>
  outputPerKomponen: Array<{ name: string; value: number }>
  totalPenerima: number
  totalJiwa: number
  penerimaKomunalVsIndividu: Array<{ name: string; value: number }>
}

export type Kecamatan = {
  id: number
  nama_kecamatan?: string
  jumlah_desa?: number
}

export type Desa = {
  id: number
  nama_desa?: string
  kecamatan_id?: number
  kecamatan?: Kecamatan | null
}

export type Kegiatan = {
  id: number
  nama_kegiatan?: string
  nama_sub_kegiatan?: string
  sumber_dana?: string
  tahun_anggaran?: number | string
}

export type Pengawas = {
  id: number
  nama: string
  nip?: string | null
  jabatan?: string | null
  telepon?: string | null
  jumlah_lokasi?: number
  total_pagu?: number
  created_at?: string | null
  updated_at?: string | null
}

export type Pekerjaan = {
  id: number
  kode_rekening?: string | null
  nama_paket: string
  pagu?: number
  progress_total?: number
  deviasi?: number
  foto_count?: number
  foto_required_count?: number | null
  foto_status?: 'belum_ada_foto' | 'belum_selesai' | 'selesai' | null
  assignment_sources?: string[]
  kecamatan?: Kecamatan | null
  desa?: Desa | null
  kegiatan?: Kegiatan | null
  pengawas?: Pengawas | null
  pendamping?: Pengawas | null
  penerima_count?: number
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export type ProgressItem = {
  nama_item?: string
  rincian_item?: string | null
  satuan?: string
  harga_satuan?: number | string | null
  bobot?: number | string | null
  target_volume?: number | string | null
  weekly_data?: Record<
    string,
    {
      rencana?: number | null
      realisasi?: number | null
    }
  >
}

export type ProgressReport = {
  id: number
  pekerjaan_id: number
  content?: {
    week_count?: number
    items?: ProgressItem[]
  } | null
  created_at?: string | null
  updated_at?: string | null
}

export type ProgressReportView = {
  pekerjaan?: {
    id?: number
    nama?: string | null
    pagu?: number | null
    lokasi?: string | null
    desa_nama?: string | null
    kecamatan_nama?: string | null
  } | null
  kegiatan?: {
    nama_kegiatan?: string | null
    nama_sub_kegiatan?: string | null
    sumber_dana?: string | null
    tahun_anggaran?: number | string | null
  } | null
  kontrak?: {
    tgl_spmk?: string | null
    tgl_spk?: string | null
    tgl_selesai?: string | null
    spk?: string | null
    spmk?: string | null
    nilai_kontrak?: number | null
  } | null
  penyedia?: {
    nama?: string | null
    direktur?: string | null
  } | null
  items?: ProgressItem[]
  totals?: {
    total_bobot?: number | null
    total_accumulated_real?: number | null
    total_weighted_progress?: number | null
  } | null
  max_minggu?: number | null
}

export type ChecklistMatrixColumn = {
  id: number
  name: string
  description?: string | null
  sort_order?: number | null
}

export type ChecklistMatrixCell = {
  is_checked: boolean
  checked_at?: string | null
  checked_by?: number | null
  notes?: string | null
}

export type ChecklistMatrixRow = {
  id: number
  nama_paket: string
  kegiatan?: {
    id: number
    nama_sub_kegiatan?: string | null
  } | null
  checklist: Record<string, ChecklistMatrixCell>
}

export type ChecklistMatrixResponse = {
  columns: ChecklistMatrixColumn[]
  data: ChecklistMatrixRow[]
  meta?: {
    current_page?: number
    last_page?: number
    per_page?: number
    total?: number
  }
}

export type PekerjaanMediaItem = {
  id: number
  pekerjaan_id?: number
  foto_url?: string | null
  berkas_url?: string | null
  keterangan?: string | null
  jenis_dokumen?: string | null
  koordinat?: string | null
  validasi_koordinat?: boolean | null
  validasi_koordinat_message?: string | null
  unit_index?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type PekerjaanMediaResponse = {
  foto: PekerjaanMediaItem[]
  berkas: PekerjaanMediaItem[]
}

export type Output = {
  id: number
  pekerjaan_id?: number | null
  komponen: string
  satuan?: string | null
  volume?: number | string | null
  penerima_is_optional?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type PekerjaanDetail = Pekerjaan & {
  foto?: Foto[]
  berkas?: Array<UnknownRecord>
  output?: Output[]
  penerima?: Penerima[]
  tags?: Array<UnknownRecord>
  kontrak?: Array<UnknownRecord>
  progress?: ProgressReport | null
}

export type Penerima = {
  id: number
  nama: string
  jumlah_jiwa?: number | null
  nik?: string | null
  alamat?: string | null
  is_komunal?: boolean | null
  pekerjaan_id?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type Foto = {
  id: number
  pekerjaan_id?: number | null
  komponen_id?: number | null
  penerima_id?: number | null
  keterangan?: string | null
  koordinat?: string | null
  validasi_koordinat?: boolean | null
  validasi_koordinat_message?: string | null
  unit_index?: number | null
  foto_url?: string | null
  foto_thumb_url?: string | null
  komponen?: {
    id?: number
    komponen?: string | null
  } | null
  penerima?: {
    id?: number
    nama?: string | null
    nik?: string | null
  } | null
  created_at?: string | null
  updated_at?: string | null
}

export type TiketComment = {
  id: number
  user_id?: number
  message: string
  created_at?: string | null
  user?: AuthUser | null
}

export type Tiket = {
  id: number
  user_id?: number
  user?: AuthUser | null
  pekerjaan_id?: number | null
  pekerjaan?: Pekerjaan | null
  subjek: string
  deskripsi?: string
  kategori?: string | null
  prioritas?: string | null
  status?: string | null
  admin_notes?: string | null
  comments?: TiketComment[]
  image_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}
