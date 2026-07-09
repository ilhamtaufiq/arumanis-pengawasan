import { useEffect, useRef } from 'react'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { isBackgroundLocationPlatformSupported, isBackgroundLocationTrackingActive } from '@/lib/background-location'
import { sendPresenceHeartbeat } from '@/lib/presence'
import { useAuth } from '@/lib/auth'

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000

/**
 * Fallback presence saat pelacakan GPS background tidak aktif (mis. web).
 * Di Android/iOS, koordinat + heartbeat dikirim oleh background-location-task —
 * jangan duplikasi di foreground agar tidak membebani UI thread.
 */
export function usePresenceHeartbeat() {
  const { canFetch } = useAuth()
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (!canFetch) return

    if (Platform.OS !== 'web' && isBackgroundLocationPlatformSupported()) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const ping = async () => {
      if (cancelled || appState.current !== 'active') return
      try {
        if (Platform.OS !== 'web') {
          const trackingActive = await isBackgroundLocationTrackingActive()
          if (trackingActive) return
        }
        await sendPresenceHeartbeat()
      } catch {
        // Best-effort presence; abaikan kegagalan sementara.
      }
    }

    const startTimer = () => {
      if (timer) return
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
        void ping()
        startTimer()
      } else {
        stopTimer()
      }
    }

    if (appState.current === 'active') {
      void ping()
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