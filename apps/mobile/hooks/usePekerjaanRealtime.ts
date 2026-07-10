import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { getEcho } from '@/lib/echo'
import { invalidatePekerjaanRealtime, type PekerjaanUpdatedPayload } from '@/lib/realtime'
import { isReverbEnabled } from '@/lib/reverb-config'

// Gabungkan burst event di channel detail agar UI tidak re-render setiap tick.
const DETAIL_INVALIDATE_DEBOUNCE_MS = 2_000

/**
 * Subscribe channel detail pekerjaan.
 * @param enabled — matikan saat layar tidak fokus / auth belum siap.
 */
export function usePekerjaanRealtime(pekerjaanId: number, enabled = true) {
  const queryClient = useQueryClient()
  const pendingPayloads = useRef<PekerjaanUpdatedPayload[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    if (!enabled || !isReverbEnabled() || !Number.isFinite(pekerjaanId) || pekerjaanId <= 0) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const flushInvalidations = () => {
      flushTimer.current = null
      // Jangan ganggu UI saat app di background.
      if (appState.current !== 'active') {
        pendingPayloads.current = []
        return
      }

      const payloads = pendingPayloads.current.splice(0)
      if (payloads.length === 0) return

      const latest = payloads[payloads.length - 1]
      if (latest) {
        invalidatePekerjaanRealtime(queryClient, latest, { scope: 'detail' })
      }
    }

    const scheduleFlush = () => {
      if (flushTimer.current) return
      flushTimer.current = setTimeout(flushInvalidations, DETAIL_INVALIDATE_DEBOUNCE_MS)
    }

    const channelName = `pekerjaan.${pekerjaanId}`
    const channel = echo.private(channelName)

    const handler = (payload: PekerjaanUpdatedPayload) => {
      if (payload.pekerjaan_id !== pekerjaanId) return
      pendingPayloads.current.push(payload)
      scheduleFlush()
    }

    const onAppState = (next: AppStateStatus) => {
      appState.current = next
      if (next !== 'active' && flushTimer.current) {
        clearTimeout(flushTimer.current)
        flushTimer.current = null
        pendingPayloads.current = []
      }
    }

    channel.listen('.pekerjaan.updated', handler)
    const sub = AppState.addEventListener('change', onAppState)

    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
        flushTimer.current = null
      }
      pendingPayloads.current = []
      channel.stopListening('.pekerjaan.updated', handler)
      echo.leave(`private-${channelName}`)
      sub.remove()
    }
  }, [enabled, pekerjaanId, queryClient])
}
