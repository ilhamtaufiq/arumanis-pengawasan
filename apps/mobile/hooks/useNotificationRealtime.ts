import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getEcho } from '@/lib/echo'
import { isReverbEnabled } from '@/lib/reverb-config'
import { useAuth } from '@/lib/auth'

export function useNotificationRealtime() {
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

    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    }

    channel.notification(handler)

    return () => {
      echo.leave(`private-${channelName}`)
    }
  }, [canFetch, queryClient, user?.id])
}