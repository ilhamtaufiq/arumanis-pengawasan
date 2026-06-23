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