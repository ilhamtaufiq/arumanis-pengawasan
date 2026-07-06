import '@/lib/exifr-polyfill'
import exifr from 'exifr'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import type { PickedImageAsset } from './foto-upload-meta'

export async function extractCoordinatesFromAsset(asset: PickedImageAsset): Promise<string | null> {
  try {
    if (asset.file) {
      const gps = await exifr.gps(asset.file)
      if (gps?.latitude != null && gps?.longitude != null) {
        return formatKoordinat(gps.latitude, gps.longitude)
      }
    }

    const response = await fetch(asset.uri)
    if (!response.ok) {
      return null
    }

    const blob = await response.blob()
    const gps = await exifr.gps(blob)
    if (gps?.latitude != null && gps?.longitude != null) {
      return formatKoordinat(gps.latitude, gps.longitude)
    }
  } catch {
    return null
  }

  return null
}