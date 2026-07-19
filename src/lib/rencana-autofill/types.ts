export type JenisProyekFase = 'sanitasi' | 'air_minum' | string

export type MasterFasePekerjaan = {
  id: number
  jenis_proyek: JenisProyekFase
  kode_fase: string
  nama_fase: string
  prioritas: number
  overlap_persen: number
  durasi_faktor: number
  keywords: string[] | string | null
  deskripsi?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

/** Item progress sederhana untuk bridge scheduler */
export type ProgressItemLike = {
  id?: string | number
  nama_item?: string | null
  rincian_item?: string | null
  satuan?: string | null
  harga_satuan?: number | string | null
  target_volume?: number | string | null
  bobot?: number | string | null
  weekly_data?: Record<
    string,
    {
      rencana?: number | null
      realisasi?: number | null
    }
  >
}
