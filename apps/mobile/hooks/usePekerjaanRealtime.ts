import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getEcho } from '@/lib/echo'
import { invalidatePekerjaanRealtime, type PekerjaanUpdatedPayload } from '@/lib/realtime'
import { isReverbEnabled } from '@/lib/reverb-config'
import { useAuth } from '@/lib/auth'

export function usePekerjaanRealtime(pekerjaanId: number) {
  const queryClient = useQueryClient()
  const { canFetch } = useAuth()

  useEffect(() => {
    if (!canFetch || !isReverbEnabled() || !Number.isFinite(pekerjaanId) || pekerjaanId <= 0) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const channelName = `pekerjaan.${pekerjaanId}`
    const channel = echo.private(channelName)

    const handler = (payload: PekerjaanUpdatedPayload) => {
      if (payload.pekerjaan_id !== pekerjaanId) return
      invalidatePekerjaanRealtime(queryClient, payload, { scope: 'detail' })
    }

    channel.listen('.pekerjaan.updated', handler)

    return () => {
      channel.stopListening('.pekerjaan.updated', handler)
      echo.leave(`private-${channelName}`)
    }
  }, [canFetch, pekerjaanId, queryClient])
}