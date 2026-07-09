import { hasParsableKoordinat } from '@pengawas/shared/koordinat'

export type KoordinatValidationUi = {
  valid: boolean
  message: string
  loading: boolean
  /** Upload tetap diizinkan bila true (mis. di luar desa = catatan). */
  allowUpload: boolean
}

export function buildKoordinatValidationFromApi(input: {
  validasi_koordinat: boolean
  validasi_koordinat_message: string
}): KoordinatValidationUi {
  const valid = Boolean(input.validasi_koordinat)
  return {
    valid,
    message: input.validasi_koordinat_message || 'Validasi selesai.',
    loading: false,
    allowUpload: true,
  }
}

export function buildKoordinatValidationOffline(): KoordinatValidationUi {
  return {
    valid: true,
    message: 'Offline — validasi server ditunda. Koordinat siap dipakai untuk antrean upload.',
    loading: false,
    allowUpload: true,
  }
}

export function buildKoordinatValidationApiFailure(): KoordinatValidationUi {
  return {
    valid: false,
    message: 'Validasi server gagal. Koordinat akan dicek ulang saat foto diunggah.',
    loading: false,
    allowUpload: true,
  }
}

export function canUploadFotoWithKoordinat(input: {
  hasAsset: boolean
  koordinat: string
  isUploading: boolean
  isLocating: boolean
  validation: KoordinatValidationUi | null
}) {
  if (!input.hasAsset || input.isUploading || input.isLocating) {
    return false
  }

  if (!hasParsableKoordinat(input.koordinat)) {
    return false
  }

  if (!input.validation || input.validation.loading) {
    return false
  }

  return input.validation.allowUpload
}

export function koordinatValidationTone(validation: KoordinatValidationUi | null) {
  if (!validation || validation.loading) {
    return 'muted' as const
  }

  if (validation.valid) {
    return 'success' as const
  }

  if (validation.allowUpload) {
    return 'warning' as const
  }

  return 'danger' as const
}