import { requestJson } from '@/lib/api'
import {
  type AppNotification,
  type NotificationListResult,
  type NotificationResponse,
  type PaginatedNotifications,
  isPaginatedNotifications,
  parseNotificationResponse,
  resolveNotificationLink,
  resolveNotificationType,
  isBannerNotification,
  hasBroadcastHistory,
  isPopupNotification,
  notificationTypeMeta,
  type NotificationType,
  type ResolvedNotificationLink,
} from '@pengawas/shared/notifications'

export type {
  AppNotification,
  NotificationListResult,
  NotificationResponse,
  PaginatedNotifications,
  NotificationType,
  ResolvedNotificationLink,
}

export {
  isPaginatedNotifications,
  resolveNotificationType,
  isBannerNotification,
  hasBroadcastHistory,
  isPopupNotification,
  notificationTypeMeta,
}

export function resolveNotificationLinkForWeb(url?: string) {
  return resolveNotificationLink(url, 'web')
}

export { resolveNotificationLinkForWeb as resolveNotificationLink }

export async function getNotifications(
  unreadOnly = false,
  page = 1,
): Promise<NotificationListResult> {
  const params = new URLSearchParams({
    unread_only: unreadOnly ? 'true' : 'false',
  })

  if (!unreadOnly) {
    params.set('page', String(page))
  }

  const response = await requestJson<NotificationResponse | undefined>(
    `/notifications?${params.toString()}`,
  )

  return parseNotificationResponse(response, unreadOnly)
}

export async function markNotificationRead(id: string) {
  return requestJson<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead() {
  return requestJson<{ message: string }>('/notifications/mark-all-read', { method: 'POST' })
}