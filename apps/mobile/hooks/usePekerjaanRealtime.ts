import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getEcho } from '@/lib/echo'
import { invalidatePekerjaanRealtime, type PekerjaanUpdatedPayload } from '@/lib/realtime'
import { isReverbEnabled } from '@/lib/reverb-config'
import { useAuth } from '@/lib/auth'

const DETAIL_INVALIDATE_DEBOUNCE_MS = 500

export function usePekerjaanRealtime(pekerjaanId: number) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()
  const pendingPayloads = useRef<PekerjaanUpdatedPayload[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!canFetch || !isReverbEnabled() || !Number.isFinite(pekerjaanId) || pekerjaanId <= 0) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const flushInvalidations = () => {
      flushTimer.current = null
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
  }, [canFetch, pekerjaanId, queryClient])
}