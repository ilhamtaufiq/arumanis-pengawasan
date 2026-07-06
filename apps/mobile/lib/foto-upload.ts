import { Platform } from 'react-native'
import {
  normalizeFotoFileMeta,
  toAcceptedFotoFile,
  type PickedImageAsset,
} from './foto-upload-meta'

export type { PickedImageAsset } from './foto-upload-meta'
export { normalizeFotoFileMeta } from './foto-upload-meta'

export async function appendFotoFileToFormData(formData: FormData, asset: PickedImageAsset) {
  const { fileName, mimeType } = normalizeFotoFileMeta(asset)

  if (Platform.OS === 'web') {
    let file = asset.file
    if (!file) {
      const response = await fetch(asset.uri)
      if (!response.ok) {
        throw new Error('Gagal membaca file foto dari perangkat.')
      }
      const blob = await response.blob()
      file = toAcceptedFotoFile(blob, fileName, mimeType)
    } else if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type) || file.name !== fileName) {
      file = toAcceptedFotoFile(file, fileName, mimeType)
    }

    formData.append('file', file, fileName)
    return
  }

  formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob)
}