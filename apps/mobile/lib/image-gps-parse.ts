import { formatKoordinat } from '@pengawas/shared/koordinat'

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