import { ExternalLink } from 'lucide-react'
import { AnchorButton, Badge, Button, EmptyState, Spinner } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import {
  notificationTypeMeta,
  resolveNotificationLink,
  resolveNotificationType,
  type AppNotification,
} from '@/lib/notifications'

type NotificationListProps = {
  notifications: AppNotification[]
  isLoading?: boolean
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onMarkRead?: (id: string) => void
  onItemClick?: (notification: AppNotification) => void
}

export function NotificationList({
  notifications,
  isLoading = false,
  compact = false,
  emptyTitle = 'Belum ada notifikasi',
  emptyDescription = 'Pengumuman dari pusat akan muncul di sini.',
  onMarkRead,
  onItemClick,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="notification-list__loading">
        <Spinner />
        <span>Memuat notifikasi...</span>
      </div>
    )
  }

  if (notifications.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className={compact ? 'notification-list notification-list--compact' : 'notification-list'}>
      {notifications.map((notification) => {
        const type = resolveNotificationType(notification.data.type)
        const meta = notificationTypeMeta[type]
        const link = resolveNotificationLink(notification.data.url)
        const isUnread = !notification.read_at

        return (
          <article
            key={notification.id}
            className={isUnread ? 'notification-item notification-item--unread' : 'notification-item'}
          >
            <div className="notification-item__head">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <time className="notification-item__time" dateTime={notification.created_at}>
                {formatDateTime(notification.created_at)}
              </time>
            </div>

            <button
              type="button"
              className="notification-item__body"
              onClick={() => onItemClick?.(notification)}
            >
              <strong className="notification-item__title">{notification.data.title}</strong>
              <p className="notification-item__message">{notification.data.message}</p>
            </button>

            <div className="notification-item__actions">
              {link?.kind === 'internal' ? (
                <AnchorButton
                  variant="neutral"
                  className="notification-item__link"
                  to={link.path}
                  onClick={() => {
                    if (isUnread) onMarkRead?.(notification.id)
                  }}
                >
                  Buka
                </AnchorButton>
              ) : null}

              {link?.kind === 'external' ? (
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => {
                    if (isUnread) onMarkRead?.(notification.id)
                    window.open(link.href, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink size={14} />
                  Buka tautan
                </Button>
              ) : null}

              {isUnread && onMarkRead ? (
                <Button type="button" variant="ghost" onClick={() => onMarkRead(notification.id)}>
                  Tandai dibaca
                </Button>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}