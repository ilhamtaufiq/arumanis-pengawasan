export type PickedImageAsset = {
  uri: string
  mimeType?: string
  fileName?: string
  file?: File
}

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])

export function normalizeFotoFileMeta(asset: PickedImageAsset) {
  const rawMime = (asset.mimeType || asset.file?.type || 'image/jpeg').toLowerCase()
  const mimeType = rawMime.includes('png') ? 'image/png' : 'image/jpeg'
  const extension = mimeType === 'image/png' ? '.png' : '.jpg'

  let fileName = asset.fileName || asset.file?.name || `foto-${Date.now()}${extension}`
  if (!/\.(jpe?g|png)$/i.test(fileName)) {
    const baseName = fileName.replace(/\.[^.]+$/, '')
    fileName = `${baseName}${extension}`
  }

  return { fileName, mimeType }
}

export function toAcceptedFotoFile(blob: Blob, fileName: string, mimeType: string) {
  const type = ACCEPTED_MIME_TYPES.has(blob.type) ? blob.type : mimeType
  return new File([blob], fileName, { type })
}