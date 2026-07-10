export type PickedImageAsset = {
  uri: string
  mimeType?: string
  fileName?: string
  file?: File
  exif?: Record<string, unknown> | null
}

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])

/** Format yang ditolak API Laravel (mimes:jpg,jpeg,png). */
const UNSUPPORTED_HINTS = ['heic', 'heif', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif']

/**
 * Deteksi format foto yang server tidak terima (HEIC/HEIF/WebP/dll).
 * Cek mime + nama file + uri (Android sering hanya beri content:// + mime).
 */
export function getUnsupportedFotoFormatReason(asset: {
  mimeType?: string | null
  fileName?: string | null
  uri?: string | null
  file?: { type?: string; name?: string } | null
}): string | null {
  const mime = `${asset.mimeType || asset.file?.type || ''}`.toLowerCase()
  const name = `${asset.fileName || asset.file?.name || ''}`.toLowerCase()
  const uri = `${asset.uri || ''}`.toLowerCase()

  for (const hint of UNSUPPORTED_HINTS) {
    if (mime.includes(hint) || name.endsWith(`.${hint}`) || uri.includes(`.${hint}`)) {
      const label = hint.toUpperCase()
      return `Format ${label} tidak didukung. Gunakan JPG/PNG, atau ambil foto lewat kamera.`
    }
  }

  return null
}

export function isAcceptedFotoMime(mimeType?: string | null): boolean {
  if (!mimeType) return true
  const normalized = mimeType.toLowerCase()
  return ACCEPTED_MIME_TYPES.has(normalized) || normalized === 'image/*'
}

export function normalizeFotoFileMeta(asset: PickedImageAsset) {
  const unsupported = getUnsupportedFotoFormatReason(asset)
  if (unsupported) {
    throw new Error(unsupported)
  }

  const rawMime = (asset.mimeType || asset.file?.type || 'image/jpeg').toLowerCase()
  const mimeType = rawMime.includes('png') ? 'image/png' : 'image/jpeg'
  const extension = mimeType === 'image/png' ? '.png' : '.jpg'

  let fileName = asset.fileName || asset.file?.name || `foto-${Date.now()}${extension}`
  if (!/\.(jpe?g|png)$/i.test(fileName)) {
    const baseName = fileName.replace(/\.[^.]+$/, '') || `foto-${Date.now()}`
    fileName = `${baseName}${extension}`
  }

  return { fileName, mimeType }
}

export function toAcceptedFotoFile(blob: Blob, fileName: string, mimeType: string) {
  const type = ACCEPTED_MIME_TYPES.has(blob.type) ? blob.type : mimeType
  return new File([blob], fileName, { type })
}