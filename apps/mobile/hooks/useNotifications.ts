import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationListResult } from '@pengawas/shared/notifications'
import { queryKeys } from '@pengawas/shared/query-keys'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api'
import { isReverbEnabled } from '@/lib/reverb-config'

export function useNotificationList(unreadOnly = false, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unreadOnly, page),
    queryFn: () => getNotifications(unreadOnly, page),
    enabled,
  })
}

export function useUnreadNotifications(pollInterval = 20_000, enabled = true) {
  const realtimeEnabled = isReverbEnabled()

  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: () => getNotifications(true),
    enabled,
    refetchInterval: realtimeEnabled ? false : pollInterval,
    refetchIntervalInBackground: !realtimeEnabled,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function extractNotificationList(data?: NotificationListResult) {
  return data?.notifications ?? []
}