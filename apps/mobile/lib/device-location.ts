import * as Location from 'expo-location'
import { Platform } from 'react-native'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import {
  buildLocationAttempts,
  buildPhotoUploadLocationAttempts,
  buildResultMessage,
  type DeviceKoordinatResult,
  type KoordinatSource,
  type LocationAccuracyLevel,
  type LocationAttemptPlan,
} from '@/lib/location-strategy'
import {
  fetchNetworkConnectivity,
  shouldPreferCellularLocation,
  type NetworkConnectivity,
} from '@/lib/network-context'

export type { DeviceKoordinatResult, KoordinatSource } from '@/lib/location-strategy'

const POSITION_TIMEOUT_MS = 12_000
const PHOTO_POSITION_TIMEOUT_MS = 6_000
const PHOTO_TOTAL_TIMEOUT_MS = 16_000
const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000

export type ResolveKoordinatOptions = {
  /** Prioritaskan cache GPS terakhir (cocok untuk upload foto). */
  preferLastKnown?: boolean
  /** Batas waktu per percobaan getCurrentPosition. */
  attemptTimeoutMs?: number
  /** Batas waktu total seluruh proses. */
  totalTimeoutMs?: number
  /** Pakai urutan lokasi lebih cepat untuk foto. */
  fast?: boolean
}

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

async function tryGetPosition(
  level: LocationAccuracyLevel,
  timeoutMs: number,
): Promise<Location.LocationObject | null> {
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: mapAccuracyLevel(level),
        ...(Platform.OS === 'android' ? { mayShowUserSettingsDialog: true } : {}),
      }),
      timeoutMs,
    )
    return position
  } catch {
    return null
  }
}

async function ensureForegroundPermission(requestIfNeeded: boolean): Promise<void> {
  const current = await Location.getForegroundPermissionsAsync()
  if (current.status === 'granted') {
    return
  }

  if (!requestIfNeeded) {
    throw new Error('Izin lokasi diperlukan untuk mengisi koordinat GPS.')
  }

  const permission = await Location.requestForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    throw new Error('Izin lokasi diperlukan untuk mengisi koordinat GPS.')
  }
}

async function readLastKnownKoordinat(maxAgeMs: number): Promise<DeviceKoordinatResult | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs, requiredAccuracy: 500 })
  if (!last) {
    return null
  }

  return {
    koordinat: formatKoordinat(last.coords.latitude, last.coords.longitude),
    source: 'last_known',
    message: 'Koordinat dari lokasi terakhir perangkat.',
  }
}

function buildAttempts(preferCellularNetwork: boolean, fast: boolean): LocationAttemptPlan[] {
  return fast
    ? buildPhotoUploadLocationAttempts(preferCellularNetwork)
    : buildLocationAttempts(preferCellularNetwork)
}

export async function resolveDeviceKoordinat(
  network?: NetworkConnectivity,
  options?: ResolveKoordinatOptions,
): Promise<DeviceKoordinatResult> {
  if (Platform.OS === 'web') {
    return resolveWebKoordinat()
  }

  const fast = options?.fast ?? false
  const attemptTimeoutMs = options?.attemptTimeoutMs ?? (fast ? PHOTO_POSITION_TIMEOUT_MS : POSITION_TIMEOUT_MS)
  const totalTimeoutMs = options?.totalTimeoutMs ?? (fast ? PHOTO_TOTAL_TIMEOUT_MS : POSITION_TIMEOUT_MS * 4)
  const preferLastKnown = options?.preferLastKnown ?? fast

  const resolve = async (): Promise<DeviceKoordinatResult> => {
    const connectivity = network ?? (await fetchNetworkConnectivity())

    await ensureForegroundPermission(true)
    await ensureNetworkLocationProvider()

    if (preferLastKnown) {
      const cached = await readLastKnownKoordinat(LAST_KNOWN_MAX_AGE_MS)
      if (cached) {
        return cached
      }
    }

    const preferCellularNetwork = shouldPreferCellularLocation(connectivity)

    for (const attempt of buildAttempts(preferCellularNetwork, fast)) {
      const position = await tryGetPosition(attempt.level, attemptTimeoutMs)
      if (!position) continue

      return {
        koordinat: formatKoordinat(position.coords.latitude, position.coords.longitude),
        source: attempt.source,
        message: buildResultMessage(attempt.source, connectivity),
      }
    }

    const cached = await readLastKnownKoordinat(Number.POSITIVE_INFINITY)
    if (cached) {
      return cached
    }

    if (preferCellularNetwork) {
      throw new Error(
        'Gagal mendapatkan koordinat. Pastikan GPS aktif dan sinyal seluler tersedia (paket data tidak wajib).',
      )
    }

    throw new Error('Gagal mendapatkan koordinat. Aktifkan GPS dan izinkan akses lokasi.')
  }

  try {
    return await withTimeout(resolve(), totalTimeoutMs)
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      const cached = await readLastKnownKoordinat(Number.POSITIVE_INFINITY)
      if (cached) {
        return cached
      }
      throw new Error('GPS terlalu lama merespons. Isi koordinat manual atau coba lagi.')
    }
    throw error
  }
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

/** Lokasi cepat untuk upload foto — cache dulu, timeout pendek. */
export async function resolvePhotoUploadKoordinat(
  network?: NetworkConnectivity,
): Promise<DeviceKoordinatResult> {
  return resolveDeviceKoordinat(network, { fast: true, preferLastKnown: true })
}

/** Lokasi ringan untuk presence heartbeat — hanya cache, tanpa getCurrentPosition. */
export async function resolvePresenceKoordinat(): Promise<DeviceKoordinatResult | null> {
  if (Platform.OS === 'web') {
    return null
  }

  const permission = await Location.getForegroundPermissionsAsync()
  if (permission.status !== 'granted') {
    return readLastKnownKoordinat(Number.POSITIVE_INFINITY)
  }

  const recent = await readLastKnownKoordinat(LAST_KNOWN_MAX_AGE_MS)
  if (recent) {
    return recent
  }

  return readLastKnownKoordinat(Number.POSITIVE_INFINITY)
}