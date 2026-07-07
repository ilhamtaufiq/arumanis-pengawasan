import '@/lib/exifr-polyfill'
import * as FileSystem from 'expo-file-system'
import exifr from 'exifr'
import { Platform } from 'react-native'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import type { PickedImageAsset } from './foto-upload-meta'

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatGpsPair(latitude: number, longitude: number) {
  const lat = latitude > 0 && latitude < 8 ? -latitude : latitude
  return formatKoordinat(lat, longitude)
}

export function parseCoordinatesFromPickerExif(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null

  const directLat = toNumber(exif.GPSLatitude ?? exif.latitude ?? exif.Latitude)
  const directLng = toNumber(exif.GPSLongitude ?? exif.longitude ?? exif.Longitude)
  if (directLat != null && directLng != null) {
    return formatGpsPair(directLat, directLng)
  }

  const gpsBlock = (exif.GPS ?? exif['{GPS}']) as Record<string, unknown> | undefined
  if (gpsBlock) {
    const lat = toNumber(gpsBlock.Latitude ?? gpsBlock.GPSLatitude ?? gpsBlock.latitude)
    const lng = toNumber(gpsBlock.Longitude ?? gpsBlock.GPSLongitude ?? gpsBlock.longitude)
    if (lat != null && lng != null) {
      return formatGpsPair(lat, lng)
    }
  }

  return null
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (!info.exists) return null

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
      return formatGpsPair(gps.latitude, gps.longitude)
    }
  } catch {
    return null
  }
  return null
}

export async function extractCoordinatesFromAsset(asset: PickedImageAsset): Promise<string | null> {
  const fromPickerExif = parseCoordinatesFromPickerExif(asset.exif ?? null)
  if (fromPickerExif) {
    return fromPickerExif
  }

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
      const fromBlob = await extractGpsWithExifr(blob)
      if (fromBlob) return fromBlob
    }
  } catch {
    return null
  }

  return null
}