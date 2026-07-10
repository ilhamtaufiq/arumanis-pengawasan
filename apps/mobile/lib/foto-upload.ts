import { Platform } from 'react-native'
import {
  getUnsupportedFotoFormatReason,
  normalizeFotoFileMeta,
  toAcceptedFotoFile,
  type PickedImageAsset,
} from './foto-upload-meta'

export type { PickedImageAsset } from './foto-upload-meta'
export { getUnsupportedFotoFormatReason, normalizeFotoFileMeta } from './foto-upload-meta'

export async function appendFotoFileToFormData(formData: FormData, asset: PickedImageAsset) {
  const unsupported = getUnsupportedFotoFormatReason(asset)
  if (unsupported) {
    throw new Error(unsupported)
  }

  const { fileName, mimeType } = normalizeFotoFileMeta(asset)

  if (Platform.OS === 'web') {
    let file = asset.file
    if (!file) {
      const response = await fetch(asset.uri)
      if (!response.ok) {
        throw new Error('Gagal membaca file foto dari perangkat.')
      }
      const blob = await response.blob()
      const blobUnsupported = getUnsupportedFotoFormatReason({
        mimeType: blob.type,
        fileName,
        uri: asset.uri,
      })
      if (blobUnsupported) {
        throw new Error(blobUnsupported)
      }
      file = toAcceptedFotoFile(blob, fileName, mimeType)
    } else if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) || file.name !== fileName) {
      const fileUnsupported = getUnsupportedFotoFormatReason({
        mimeType: file.type,
        fileName: file.name,
        uri: asset.uri,
      })
      if (fileUnsupported) {
        throw new Error(fileUnsupported)
      }
      file = toAcceptedFotoFile(file, fileName, mimeType)
    }

    formData.append('file', file, fileName)
    return
  }

  formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob)
}