import * as Location from 'expo-location'
import { Platform } from 'react-native'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import {
  buildLocationAttempts,
  buildResultMessage,
  type DeviceKoordinatResult,
  type KoordinatSource,
  type LocationAccuracyLevel,
} from '@/lib/location-strategy'
import {
  fetchNetworkConnectivity,
  shouldPreferCellularLocation,
  type NetworkConnectivity,
} from '@/lib/network-context'

export type { DeviceKoordinatResult, KoordinatSource } from '@/lib/location-strategy'

const POSITION_TIMEOUT_MS = 12_000

function mapAccuracyLevel(level: LocationAccuracyLevel): Location.Accuracy {
  if (level === 'high') return Location.Accuracy.High
  if (level === 'balanced') return Location.Accuracy.Balanced
  return Location.Accuracy.Low
}

async function ensureNetworkLocationProvider(): Promise<void> {
  if (Platform.OS !== 'android') return

  try {
    await Location.enableNetworkProviderAsync()
  } catch {
    // Pengguna bisa menolak dialog sistem.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function tryGetPosition(level: LocationAccuracyLevel): Promise<Location.LocationObject | null> {
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: mapAccuracyLevel(level),
        ...(Platform.OS === 'android' ? { mayShowUserSettingsDialog: true } : {}),
      }),
      POSITION_TIMEOUT_MS,
    )
    return position
  } catch {
    return null
  }
}

async function ensureForegroundPermission(): Promise<void> {
  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    throw new Error('Izin lokasi diperlukan untuk mengisi koordinat GPS.')
  }
}

export async function resolveDeviceKoordinat(
  network?: NetworkConnectivity,
): Promise<DeviceKoordinatResult> {
  if (Platform.OS === 'web') {
    return resolveWebKoordinat()
  }

  const connectivity = network ?? (await fetchNetworkConnectivity())

  await ensureForegroundPermission()
  await ensureNetworkLocationProvider()

  const preferCellularNetwork = shouldPreferCellularLocation(connectivity)

  for (const attempt of buildLocationAttempts(preferCellularNetwork)) {
    const position = await tryGetPosition(attempt.level)
    if (!position) continue

    return {
      koordinat: formatKoordinat(position.coords.latitude, position.coords.longitude),
      source: attempt.source,
      message: buildResultMessage(attempt.source, connectivity),
    }
  }

  const last = await Location.getLastKnownPositionAsync()
  if (last) {
    return {
      koordinat: formatKoordinat(last.coords.latitude, last.coords.longitude),
      source: 'last_known',
      message: buildResultMessage('last_known', connectivity),
    }
  }

  if (preferCellularNetwork) {
    throw new Error(
      'Gagal mendapatkan koordinat. Pastikan GPS aktif dan sinyal seluler tersedia (paket data tidak wajib).',
    )
  }

  throw new Error('Gagal mendapatkan koordinat. Aktifkan GPS dan izinkan akses lokasi.')
}

async function resolveWebKoordinat(): Promise<DeviceKoordinatResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Browser tidak mendukung geolocation.')
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('timeout')), {
      enableHighAccuracy: true,
      timeout: POSITION_TIMEOUT_MS,
      maximumAge: 0,
    })
  })

  return {
    koordinat: formatKoordinat(position.coords.latitude, position.coords.longitude),
    source: 'gps',
    message: 'Koordinat dari GPS perangkat.',
  }
}

export async function getDeviceKoordinat(): Promise<string> {
  const result = await resolveDeviceKoordinat()
  return result.koordinat
}