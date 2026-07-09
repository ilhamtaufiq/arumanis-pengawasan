import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import { useEffect, useRef } from 'react'
import { getEcho } from '@/lib/echo'
import { invalidatePekerjaanRealtime, type PekerjaanUpdatedPayload } from '@/lib/realtime'
import { isReverbEnabled } from '@/lib/reverb-config'
import { useAuth } from '@/lib/auth'

const REALTIME_INVALIDATE_DEBOUNCE_MS = 400

export function usePengawasRealtime() {
  const queryClient = useQueryClient()
  const { canFetch, user } = useAuth()
  const pendingPayloads = useRef<PekerjaanUpdatedPayload[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!canFetch || !user?.id || !isReverbEnabled()) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const flushInvalidations = () => {
      flushTimer.current = null
      const payloads = pendingPayloads.current.splice(0)
      if (payloads.length === 0) return

      const latestByPekerjaan = new Map<number, PekerjaanUpdatedPayload>()
      let needsGlobal = false

      for (const payload of payloads) {
        if (!payload.pekerjaan_id) {
          needsGlobal = true
          continue
        }
        latestByPekerjaan.set(payload.pekerjaan_id, payload)
      }

      if (needsGlobal || latestByPekerjaan.size > 1) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.pekerjaan.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      }

      for (const payload of latestByPekerjaan.values()) {
        invalidatePekerjaanRealtime(queryClient, payload, { scope: 'detail' })
      }
    }

    const scheduleFlush = () => {
      if (flushTimer.current) return
      flushTimer.current = setTimeout(flushInvalidations, REALTIME_INVALIDATE_DEBOUNCE_MS)
    }

    const channelName = `App.Models.User.${user.id}`
    const channel = echo.private(channelName)

    const handler = (payload: PekerjaanUpdatedPayload) => {
      pendingPayloads.current.push(payload)
      scheduleFlush()
    }

    channel.listen('.pekerjaan.updated', handler)

    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
        flushTimer.current = null
      }
      pendingPayloads.current = []
      channel.stopListening('.pekerjaan.updated', handler)
      echo.leave(`private-${channelName}`)
    }
  }, [canFetch, queryClient, user?.id])
}