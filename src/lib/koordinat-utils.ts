export const DEFAULT_MAP_CENTER = { lat: -6.9175, lng: 107.6191 }

export function parseKoordinatString(value: string): { lat: number; lng: number } | null {
  const match = value.trim().match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) {
    return null
  }

  const lat = Number.parseFloat(match[1] ?? '')
  const lng = Number.parseFloat(match[2] ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

export function formatKoordinat(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/**
 * Parse koordinat yang tersimpan tanpa koma, mis. "-7.1653984107.1545166".
 */
export function parseKoordinatLoose(value?: string | null): { lat: number; lng: number } | null {
  if (!value?.trim()) {
    return null
  }

  const withComma = parseKoordinatString(value)
  if (withComma) {
    return withComma
  }

  const cleaned = value.trim().replace(/\s/g, '')
  const lngMarker = cleaned.search(/10\d\.\d+/)
  if (lngMarker > 0) {
    const lat = Number.parseFloat(cleaned.slice(0, lngMarker))
    const lng = Number.parseFloat(cleaned.slice(lngMarker))
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng }
    }
  }

  return null
}

export function formatKoordinatDisplay(value?: string | null): string {
  if (!value?.trim()) {
    return '-'
  }

  const parsed = parseKoordinatLoose(value)
  if (!parsed) {
    return value
  }

  return formatKoordinat(parsed.lat, parsed.lng)
}