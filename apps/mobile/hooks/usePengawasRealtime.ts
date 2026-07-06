import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getEcho } from '@/lib/echo'
import { invalidatePekerjaanRealtime, type PekerjaanUpdatedPayload } from '@/lib/realtime'
import { isReverbEnabled } from '@/lib/reverb-config'
import { useAuth } from '@/lib/auth'

export function usePengawasRealtime() {
  const queryClient = useQueryClient()
  const { canFetch, user } = useAuth()

  useEffect(() => {
    if (!canFetch || !user?.id || !isReverbEnabled()) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const channelName = `App.Models.User.${user.id}`
    const channel = echo.private(channelName)

    const handler = (payload: PekerjaanUpdatedPayload) => {
      invalidatePekerjaanRealtime(queryClient, payload, { scope: 'global' })
      if (payload.pekerjaan_id) {
        invalidatePekerjaanRealtime(queryClient, payload, { scope: 'detail' })
      }
    }

    channel.listen('.pekerjaan.updated', handler)

    return () => {
      channel.stopListening('.pekerjaan.updated', handler)
      echo.leave(`private-${channelName}`)
    }
  }, [canFetch, queryClient, user?.id])
}