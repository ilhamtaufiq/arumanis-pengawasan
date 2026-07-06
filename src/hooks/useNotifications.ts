import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@pengawas/shared/query-keys'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListResult,
} from '@/lib/notifications'
import { isEchoEnabled } from '@/lib/echo'

export const notificationKeys = queryKeys.notifications

export function useNotificationList(unreadOnly = false, page = 1) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly, page),
    queryFn: () => getNotifications(unreadOnly, page),
  })
}

export function useUnreadNotifications(pollInterval = 20_000) {
  const realtimeEnabled = isEchoEnabled()

  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => getNotifications(true),
    refetchInterval: realtimeEnabled ? false : pollInterval,
    refetchIntervalInBackground: !realtimeEnabled,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function extractNotificationList(data?: NotificationListResult) {
  return data?.notifications ?? []
}