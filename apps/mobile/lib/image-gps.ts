import '@/lib/exifr-polyfill'
import * as FileSystem from 'expo-file-system'
import exifr from 'exifr'
import { Platform } from 'react-native'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import type { PickedImageAsset } from './foto-upload-meta'
import { parseCoordinatesFromPickerExif } from './image-gps-parse'

export { parseCoordinatesFromPickerExif } from './image-gps-parse'

export const EXIF_EXTRACT_TIMEOUT_MS = 3_500
export const MAX_EXIF_FILE_BYTES = 4 * 1024 * 1024

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (!info.exists) return null
    if (typeof info.size === 'number' && info.size > MAX_EXIF_FILE_BYTES) {
      return null
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  } catch {
    return null
  }
}

async function extractGpsWithExifr(source: Blob | ArrayBuffer | File) {
  try {
    const gps = await exifr.gps(source)
    if (gps?.latitude != null && gps?.longitude != null) {
      const lat = gps.latitude > 0 && gps.latitude < 8 ? -gps.latitude : gps.latitude
      return formatKoordinat(lat, gps.longitude)
    }
  } catch {
    return null
  }
  return null
}

/** Cepat: hanya metadata EXIF dari image picker (tanpa baca file). */
export function getQuickCoordinatesFromAsset(asset: PickedImageAsset): string | null {
  return parseCoordinatesFromPickerExif(asset.exif ?? null)
}

/** Dalam: parse file dengan batas ukuran & timeout agar galeri tidak menggantung. */
export async function extractDeepCoordinatesFromAsset(asset: PickedImageAsset): Promise<string | null> {
  return withTimeout(extractDeepCoordinatesFromAssetInner(asset), EXIF_EXTRACT_TIMEOUT_MS)
}

async function extractDeepCoordinatesFromAssetInner(asset: PickedImageAsset): Promise<string | null> {
  try {
    if (asset.file) {
      const fromFile = await extractGpsWithExifr(asset.file)
      if (fromFile) return fromFile
    }

    if (Platform.OS !== 'web') {
      const buffer = await readUriAsArrayBuffer(asset.uri)
      if (buffer) {
        const fromUri = await extractGpsWithExifr(buffer)
        if (fromUri) return fromUri
      }
    }

    const response = await fetch(asset.uri)
    if (response.ok) {
      const blob = await response.blob()
      if (blob.size <= MAX_EXIF_FILE_BYTES) {
        const fromBlob = await extractGpsWithExifr(blob)
        if (fromBlob) return fromBlob
      }
    }
  } catch {
    return null
  }

  return null
}

/** @deprecated Pakai getQuickCoordinatesFromAsset + extractDeepCoordinatesFromAsset. */
export async function extractCoordinatesFromAsset(asset: PickedImageAsset): Promise<string | null> {
  const quick = getQuickCoordinatesFromAsset(asset)
  if (quick) return quick
  return extractDeepCoordinatesFromAsset(asset)
}