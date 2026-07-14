import type { Foto, PekerjaanDetail } from '@pengawas/shared'

/** Batas foto penuh di memori detail — di atas ini URL digunting dulu. */
export const DETAIL_FOTO_URL_SOFT_LIMIT = 40

/**
 * Detail API bisa memuat ratusan foto + URL penuh → OOM / force close di HP low-end.
 * Untuk render awal (ringkasan/output) cukup metadata slot; URL diisi saat buka tab foto.
 */
export function slimPekerjaanDetailForUi(detail: PekerjaanDetail): PekerjaanDetail {
  if (!detail || typeof detail !== 'object') return detail

  const fotos = Array.isArray(detail.foto) ? detail.foto : []
  if (fotos.length <= DETAIL_FOTO_URL_SOFT_LIMIT) {
    return {
      ...detail,
      foto: fotos,
      output: Array.isArray(detail.output) ? detail.output : [],
      penerima: Array.isArray(detail.penerima) ? detail.penerima : [],
      assignment_sources: Array.isArray(detail.assignment_sources)
        ? detail.assignment_sources.filter((s): s is string => typeof s === 'string')
        : [],
    }
  }

  const slimFotos: Foto[] = fotos.map((foto) => ({
    id: foto.id,
    pekerjaan_id: foto.pekerjaan_id,
    komponen_id: foto.komponen_id,
    penerima_id: foto.penerima_id,
    keterangan: foto.keterangan,
    koordinat: foto.koordinat,
    validasi_koordinat: foto.validasi_koordinat,
    validasi_koordinat_message: foto.validasi_koordinat_message,
    unit_index: foto.unit_index,
    // Buang URL penuh; thumb boleh tetap (atau null) — cegah OOM saat decode massal
    foto_url: null,
    foto_thumb_url: foto.foto_thumb_url || null,
    komponen: foto.komponen
      ? { id: foto.komponen.id, komponen: foto.komponen.komponen }
      : null,
    penerima: foto.penerima
      ? { id: foto.penerima.id, nama: foto.penerima.nama, nik: foto.penerima.nik }
      : null,
    created_at: foto.created_at,
    updated_at: foto.updated_at,
  }))

  return {
    ...detail,
    foto: slimFotos,
    foto_count: detail.foto_count ?? fotos.length,
    output: Array.isArray(detail.output) ? detail.output : [],
    penerima: Array.isArray(detail.penerima) ? detail.penerima : [],
    assignment_sources: Array.isArray(detail.assignment_sources)
      ? detail.assignment_sources.filter((s): s is string => typeof s === 'string')
      : [],
  }
}
