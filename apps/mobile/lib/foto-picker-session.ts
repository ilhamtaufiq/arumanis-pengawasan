import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'pengawas.foto.pending-picker-v1'

/**
 * Context upload yang harus bertahan saat app di-kill Android
 * (kamera/galeri sering membuat process activity di-recreate).
 */
export type PendingFotoPickerSession = {
  pekerjaanId: number
  komponenId: number
  slot: string
  penerimaId?: number
  replaceFotoId?: number
  /** ISO timestamp — session kadaluarsa agar tidak buka modal acak. */
  createdAt: string
}

const MAX_AGE_MS = 15 * 60_000

export async function savePendingFotoPickerSession(
  session: Omit<PendingFotoPickerSession, 'createdAt'>,
): Promise<void> {
  const payload: PendingFotoPickerSession = {
    ...session,
    createdAt: new Date().toISOString(),
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function clearPendingFotoPickerSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export async function readPendingFotoPickerSession(
  pekerjaanId?: number,
): Promise<PendingFotoPickerSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PendingFotoPickerSession
    if (!parsed?.pekerjaanId || !parsed.komponenId || !parsed.slot || !parsed.createdAt) {
      await clearPendingFotoPickerSession()
      return null
    }

    const age = Date.now() - new Date(parsed.createdAt).getTime()
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) {
      await clearPendingFotoPickerSession()
      return null
    }

    if (pekerjaanId != null && parsed.pekerjaanId !== pekerjaanId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
