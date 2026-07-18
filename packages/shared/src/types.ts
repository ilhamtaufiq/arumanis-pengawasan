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

/** Dokumen berkas pekerjaan (tbl_berkas) — upload panel pengawas */
export type Berkas = {
  id: number
  pekerjaan_id: number
  jenis_dokumen: string
  uploaded_by?: number | null
  berkas_url?: string | null
  file_name?: string | null
  mime_type?: string | null
  size?: number | null
  media_id?: number | null
  created_at?: string | null
  updated_at?: string | null
  uploader?: { id: number; name?: string; email?: string } | null
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
  /** Preferred API alias (from KecamatanResource) */
  nama_kecamatan?: string
  /** Raw DB column — may appear if resource bypassed; prefer nama_kecamatan via getKecamatanName */
  n_kec?: string
  name?: string
  jumlah_desa?: number
}

export type Desa = {
  id: number
  /** Preferred API alias (from DesaResource) */
  nama_desa?: string
  /** Raw DB column — may appear if resource bypassed; prefer nama_desa via getDesaName */
  n_desa?: string
  name?: string
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
  /** active | canceled — null/legacy dihitung active di API */
  status?: 'active' | 'canceled' | string | null
  /** Catatan paket (DB). Dashboard web memakai kolom Catatan untuk isu kelengkapan, bukan field ini. */
  catatan?: string | null
  progress_total?: number
  deviasi?: number
  progress_estimasi_fisik?: number | null
  progress_estimasi_keuangan?: number | null
  deviasi_estimasi_fisik?: number | null
  deviasi_estimasi_keuangan?: number | null
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

export type ProgressHistoryEntry = {
  id?: number
  tanggal: string
  persen: number
}

export type ProgressEstimasiSection = {
  rencana: ProgressHistoryEntry[]
  realisasi: ProgressHistoryEntry[]
  latest_rencana: number | null
  latest_realisasi: number | null
  deviasi: number | null
}

export type PekerjaanProgressEstimasi = {
  pekerjaan_id: number
  tahun_anggaran: number
  fisik: ProgressEstimasiSection
  keuangan: ProgressEstimasiSection
  updated_at: string | null
}

export type PuspenProgressFisikSnapshot = {
  kontrak_id: number
  kode_paket: string | null
  rencana: number | null
  realisasi: number | null
  deviasi: number | null
  updated_at: string | null
}

export type PekerjaanProgressEstimasiResponse = {
  data: PekerjaanProgressEstimasi
  puspen_progress_fisik: PuspenProgressFisikSnapshot[]
}

export type SavePekerjaanProgressEstimasiPayload = {
  tahun: number
  fisik: {
    rencana: Array<{ tanggal: string; persen: number }>
    realisasi: Array<{ tanggal: string; persen: number }>
  }
  keuangan: {
    rencana: Array<{ tanggal: string; persen: number }>
    realisasi: Array<{ tanggal: string; persen: number }>
  }
}

export type KontrakAddendumJenis = 'teknis' | 'biaya' | 'waktu' | 'teknis_biaya' | 'lainnya'
export type KontrakAddendumStatus = 'draft' | 'diajukan' | 'disetujui' | 'ditolak'

export type KontrakAddendumAttachmentType =
  | 'surat_permohonan'
  | 'surat_undangan_pembahasan'
  | 'risalah_rapat_pembahasan'
  | 'surat_perintah_pelaksanaan_kerja_sesuai_addendum'
  | 'cco'
  | 'laporan_pekerjaan'
  | 'berita_acara'
  | 'sk_peneliti_kontrak'

export type KontrakAddendumAttachment = {
  id: number
  name: string
  url: string
  type: string
  document_type?: string | null
  label?: string | null
  size: number
}

export type KontrakAddendum = {
  id: number
  kontrak_id: number
  addendum_ke: number
  nomor_addendum: string | null
  tanggal_addendum: string
  jenis_addendum: KontrakAddendumJenis
  alasan: string | null
  deskripsi_perubahan: string | null
  nilai_kontrak_sebelum: number | null
  nilai_kontrak_sesudah: number | null
  tgl_selesai_sebelum: string | null
  tgl_selesai_sesudah: string | null
  status: KontrakAddendumStatus
  can_submit?: boolean
  can_edit?: boolean
  attachments?: KontrakAddendumAttachment[]
  created_at?: string | null
  updated_at?: string | null
}

export type KontrakVersion = {
  type: 'utama' | 'addendum'
  id?: number
  label: string
  addendum_ke?: number
  nomor: string | null
  tanggal: string | null
  nilai_kontrak: number | null
  tgl_selesai: string | null
  status: string
}

export type KontrakDetail = {
  id: number
  spk: string | null
  kode_paket: string | null
  tgl_spk: string | null
  tgl_spmk: string | null
  tgl_selesai: string | null
  nilai_kontrak: number | null
  nilai_kontrak_berjalan?: number | null
  tgl_selesai_berjalan?: string | null
  penyedia?: { id: number; nama: string } | null
  addendums?: KontrakAddendum[]
  contract_versions?: KontrakVersion[]
  latest_approved_addendum?: KontrakAddendum | null
}

export type KontrakAddendumPayload = {
  addendum_ke: number
  tanggal_addendum: string
  jenis_addendum: KontrakAddendumJenis
  alasan?: string
  deskripsi_perubahan?: string
  nilai_kontrak_sebelum?: number | null
  nilai_kontrak_sesudah?: number | null
  tgl_selesai_sebelum?: string
  tgl_selesai_sesudah?: string
}

export type KontrakAddendumRegisterGap = {
  register_id: number
  nomor_register: string
  tanggal_register: string
  type_code?: string | null
  type_name?: string | null
  kontrak_id: number
  addendum_count: number
  pekerjaan?: {
    id: number
    nama_paket: string
    kode_rekening?: string | null
  } | null
  penyedia?: {
    id: number
    nama: string
  } | null
  pengawas?: {
    id: number
    nama: string
  } | null
}

export type KontrakAddendumRegisterGapResponse = {
  total: number
  items: KontrakAddendumRegisterGap[]
  type_codes: string[]
}
