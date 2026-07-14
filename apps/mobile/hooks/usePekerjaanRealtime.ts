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

    let cancelled = false
    let sub: { remove: () => void } | null = null
    let channelName = ''
    let channel: ReturnType<NonNullable<ReturnType<typeof getEcho>>['private']> | null = null
    let handler: ((payload: PekerjaanUpdatedPayload) => void) | null = null

    // Isolasi crash Echo/Pusher agar tidak force-close saat buka detail.
    try {
      const echo = getEcho()
      if (!echo) return

      const flushInvalidations = () => {
        flushTimer.current = null
        if (appState.current !== 'active') {
          pendingPayloads.current = []
          return
        }

        const payloads = pendingPayloads.current.splice(0)
        if (payloads.length === 0) return

        const latest = payloads[payloads.length - 1]
        if (latest) {
          try {
            invalidatePekerjaanRealtime(queryClient, latest, { scope: 'detail' })
          } catch (error) {
            console.warn('[usePekerjaanRealtime] invalidate gagal', error)
          }
        }
      }

      const scheduleFlush = () => {
        if (flushTimer.current) return
        flushTimer.current = setTimeout(flushInvalidations, DETAIL_INVALIDATE_DEBOUNCE_MS)
      }

      channelName = `pekerjaan.${pekerjaanId}`
      channel = echo.private(channelName)

      handler = (payload: PekerjaanUpdatedPayload) => {
        if (cancelled) return
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
      sub = AppState.addEventListener('change', onAppState)
    } catch (error) {
      console.warn('[usePekerjaanRealtime] init gagal (diabaikan)', error)
      return
    }

    return () => {
      cancelled = true
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
        flushTimer.current = null
      }
      pendingPayloads.current = []
      try {
        if (channel && handler) {
          channel.stopListening('.pekerjaan.updated', handler)
        }
        const echo = getEcho()
        if (echo && channelName) {
          echo.leave(`private-${channelName}`)
        }
      } catch {
        // ignore cleanup errors
      }
      sub?.remove()
    }
  }, [enabled, pekerjaanId, queryClient])
}
