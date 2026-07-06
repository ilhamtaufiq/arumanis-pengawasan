import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getEcho, isEchoEnabled } from '@/lib/echo'

export function useNotificationRealtime(userId?: number | string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId || !isEchoEnabled()) {
      return
    }

    const echo = getEcho()
    if (!echo) return

    const channelName = `App.Models.User.${userId}`
    const channel = echo.private(channelName)

    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    }

    channel.notification(handler)

    return () => {
      echo.leave(`private-${channelName}`)
    }
  }, [queryClient, userId])
}