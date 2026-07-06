import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import { formatKoordinat } from '@pengawas/shared/koordinat'
import { getBackgroundLocationEnabled } from '@/lib/background-location-prefs'
import { sendPresenceHeartbeat } from '@/lib/presence'
import { useAuth } from '@/lib/auth'

async function getQuickKoordinat(): Promise<string | undefined> {
  try {
    const last = await Location.getLastKnownPositionAsync()
    if (!last) {
      return undefined
    }

    return formatKoordinat(last.coords.latitude, last.coords.longitude)
  } catch {
    return undefined
  }
}

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000

export function usePresenceHeartbeat() {
  const { canFetch } = useAuth()
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (!canFetch) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const ping = async () => {
      if (cancelled || appState.current !== 'active') return
      try {
        const trackingEnabled = await getBackgroundLocationEnabled()
        const koordinat = trackingEnabled ? await getQuickKoordinat() : undefined
        await sendPresenceHeartbeat(koordinat)
      } catch {
        // Best-effort presence; abaikan kegagalan sementara.
      }
    }

    const startTimer = () => {
      if (timer) return
      void ping()
      timer = setInterval(() => {
        void ping()
      }, PRESENCE_HEARTBEAT_INTERVAL_MS)
    }

    const stopTimer = () => {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    const handleAppState = (next: AppStateStatus) => {
      appState.current = next
      if (next === 'active') {
        startTimer()
      } else {
        stopTimer()
      }
    }

    if (appState.current === 'active') {
      startTimer()
    }

    const subscription = AppState.addEventListener('change', handleAppState)

    return () => {
      cancelled = true
      stopTimer()
      subscription.remove()
    }
  }, [canFetch])
}