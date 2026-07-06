export type FotoStatus = 'belum_ada_foto' | 'belum_selesai' | 'selesai'

type FotoStatusInput = {
  foto_status?: FotoStatus | null
  foto_count?: number | null
  foto_required_count?: number | null
  foto?: Array<unknown> | null
}

export function resolveFotoCount(item?: FotoStatusInput | null) {
  return Math.max(Number(item?.foto_count ?? 0), item?.foto?.length ?? 0)
}

export function resolveFotoStatus(item?: FotoStatusInput | null): FotoStatus {
  const fotoCount = resolveFotoCount(item)
  const fotoRequired = Number(item?.foto_required_count ?? 0)

  if (fotoCount <= 0) {
    return 'belum_ada_foto'
  }

  if (item?.foto_status === 'selesai') {
    return 'selesai'
  }

  if (item?.foto_status === 'belum_selesai') {
    return 'belum_selesai'
  }

  if (fotoRequired > 0 && fotoCount < fotoRequired) {
    return 'belum_selesai'
  }

  if (fotoRequired > 0 && fotoCount >= fotoRequired) {
    return 'selesai'
  }

  return 'belum_selesai'
}

export function statusFotoText(status: FotoStatus) {
  if (status === 'belum_ada_foto') return 'Belum ada foto'
  if (status === 'belum_selesai') return 'Belum selesai'
  return 'Lengkap'
}

export function statusFotoTone(status: FotoStatus) {
  if (status === 'belum_ada_foto') return 'warning' as const
  if (status === 'belum_selesai') return 'danger' as const
  return 'success' as const
}