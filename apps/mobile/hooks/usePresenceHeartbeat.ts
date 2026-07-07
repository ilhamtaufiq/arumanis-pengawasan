import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { resolveDeviceKoordinat } from '@/lib/device-location'
import { sendPresenceHeartbeat } from '@/lib/presence'
import { useAuth } from '@/lib/auth'

async function getQuickKoordinat(): Promise<string | undefined> {
  try {
    const result = await resolveDeviceKoordinat()
    return result.koordinat
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
        const koordinat = await getQuickKoordinat()
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