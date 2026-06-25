import { requestJson } from '@/lib/api'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export type AppNotification = {
  id: string
  data: {
    title: string
    message: string
    url?: string
    type?: NotificationType
    is_banner?: boolean
    broadcast_history_id?: number
  }
  read_at: string | null
  created_at: string
}

export type PaginatedNotifications = {
  data: AppNotification[]
  current_page: number
  last_page: number
  total: number
  from: number | null
  to: number | null
  per_page?: number
}

export type NotificationResponse = {
  unread_count: number
  notifications: AppNotification[] | PaginatedNotifications
}

export type NotificationListResult = {
  notifications: AppNotification[]
  unread_count: number
  pagination: PaginatedNotifications | null
}

function isPaginatedNotifications(
  value: AppNotification[] | PaginatedNotifications,
): value is PaginatedNotifications {
  return !Array.isArray(value) && Array.isArray(value?.data)
}

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

  const notificationsPayload = response?.notifications
  const unreadCount = Number(response?.unread_count ?? 0)

  if (unreadOnly) {
    const notifications = Array.isArray(notificationsPayload) ? notificationsPayload : []
    return { notifications, unread_count: unreadCount, pagination: null }
  }

  if (notificationsPayload && isPaginatedNotifications(notificationsPayload)) {
    return {
      notifications: notificationsPayload.data,
      unread_count: unreadCount,
      pagination: notificationsPayload,
    }
  }

  const notifications = Array.isArray(notificationsPayload) ? notificationsPayload : []
  return { notifications, unread_count: unreadCount, pagination: null }
}

export async function markNotificationRead(id: string) {
  return requestJson<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead() {
  return requestJson<{ message: string }>('/notifications/mark-all-read', { method: 'POST' })
}

export function resolveNotificationType(type?: string): NotificationType {
  if (type === 'success' || type === 'warning' || type === 'error' || type === 'info') {
    return type
  }

  return 'info'
}

export function isBannerNotification(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export type ResolvedNotificationLink =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; href: string }
  | null

export function resolveNotificationLink(url?: string): ResolvedNotificationLink {
  if (!url?.trim()) {
    return null
  }

  const trimmed = url.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: 'external', href: trimmed }
  }

  let path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  const routeMap: Record<string, string> = {
    '/dashboard': '/',
    '/notifications': '/notifikasi',
    '/sign-in': '/login',
  }

  const mappedPath = routeMap[path]
  if (mappedPath) {
    path = mappedPath
  }

  const pekerjaanMatch = path.match(/^\/pekerjaan\/(\d+)/)
  if (pekerjaanMatch) {
    return { kind: 'internal', path: `/pekerjaan/${pekerjaanMatch[1]}` }
  }

  const buatLaporanMatch = path.match(/^\/buat-laporan\/(\d+)/)
  if (buatLaporanMatch) {
    return { kind: 'internal', path: `/buat-laporan/${buatLaporanMatch[1]}` }
  }

  const pengawasRoutes = ['/', '/pekerjaan', '/buat-laporan', '/tiket', '/panduan', '/profile', '/notifikasi']
  if (pengawasRoutes.includes(path) || path.startsWith('/pekerjaan/') || path.startsWith('/buat-laporan/')) {
    return { kind: 'internal', path }
  }

  return { kind: 'external', href: trimmed }
}

export const notificationTypeMeta: Record<
  NotificationType,
  { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }
> = {
  info: { label: 'Info', tone: 'info' },
  success: { label: 'Sukses', tone: 'success' },
  warning: { label: 'Peringatan', tone: 'warning' },
  error: { label: 'Penting', tone: 'danger' },
}