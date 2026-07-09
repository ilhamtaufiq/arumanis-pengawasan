import {
  shouldPreferCellularLocation,
  type NetworkConnectivity,
} from '@/lib/network-context-core'

export type KoordinatSource = 'gps' | 'network' | 'last_known'

export type DeviceKoordinatResult = {
  koordinat: string
  source: KoordinatSource
  message: string
}

export type LocationAccuracyLevel = 'high' | 'balanced' | 'low'

export type LocationAttemptPlan = {
  level: LocationAccuracyLevel
  source: KoordinatSource
}

export function buildLocationAttempts(preferCellularNetwork: boolean): LocationAttemptPlan[] {
  if (preferCellularNetwork) {
    return [
      { level: 'low', source: 'network' },
      { level: 'balanced', source: 'network' },
      { level: 'high', source: 'gps' },
    ]
  }

  return [
    { level: 'high', source: 'gps' },
    { level: 'balanced', source: 'network' },
    { level: 'low', source: 'network' },
  ]
}

/** Urutan lebih cepat untuk upload foto — hindari high-accuracy GPS yang lama. */
export function buildPhotoUploadLocationAttempts(preferCellularNetwork: boolean): LocationAttemptPlan[] {
  if (preferCellularNetwork) {
    return [
      { level: 'balanced', source: 'network' },
      { level: 'low', source: 'network' },
    ]
  }

  return [
    { level: 'balanced', source: 'gps' },
    { level: 'low', source: 'network' },
  ]
}

export function buildResultMessage(source: KoordinatSource, network: NetworkConnectivity): string {
  if (source === 'last_known') {
    return 'Koordinat dari cache lokasi terakhir perangkat.'
  }

  if (source === 'network' && shouldPreferCellularLocation(network)) {
    return 'Koordinat dari jaringan seluler (tanpa paket data internet).'
  }

  if (source === 'network') {
    return 'Koordinat dari jaringan lokasi perangkat (GPS + seluler/Wi-Fi).'
  }

  return 'Koordinat dari GPS perangkat.'
}