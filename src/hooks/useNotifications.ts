import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListResult,
} from '@/lib/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean, page: number) =>
    [...notificationKeys.all, 'list', { unreadOnly, page }] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}

export function useNotificationList(unreadOnly = false, page = 1) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly, page),
    queryFn: () => getNotifications(unreadOnly, page),
  })
}

export function useUnreadNotifications(pollInterval = 20_000) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: () => getNotifications(true),
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
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