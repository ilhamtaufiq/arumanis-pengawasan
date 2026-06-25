import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { Button, SectionHeader, Spinner, Surface } from '@/components/ui'
import { NotificationList } from '@/components/NotificationList'
import {
  extractNotificationList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
} from '@/hooks/useNotifications'
import { useNavigate } from 'react-router-dom'
import { resolveNotificationLink, type AppNotification } from '@/lib/notifications'

export function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)

  const unreadOnly = filter === 'unread'
  const query = useNotificationList(unreadOnly, page)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = extractNotificationList(query.data)
  const unreadCount = query.data?.unread_count ?? 0
  const pagination = query.data?.pagination

  function handleItemClick(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }

    const link = resolveNotificationLink(notification.data.url)
    if (link?.kind === 'internal') {
      navigate(link.path)
      return
    }

    if (link?.kind === 'external') {
      window.open(link.href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="stack">
      <SectionHeader
        title="Notifikasi"
        description="Pengumuman dan broadcast dari pusat Arumanis untuk akun Anda."
        action={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="neutral"
              onClick={() => markAllRead.mutate()}
              isLoading={markAllRead.isPending}
            >
              <CheckCheck size={16} />
              Tandai semua dibaca
            </Button>
          ) : null
        }
      />

      <Surface className="notification-page__toolbar">
        <div className="notification-page__filters" role="tablist" aria-label="Filter notifikasi">
          <Button
            type="button"
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => {
              setFilter('all')
              setPage(1)
            }}
          >
            Semua
          </Button>
          <Button
            type="button"
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            onClick={() => {
              setFilter('unread')
              setPage(1)
            }}
          >
            Belum dibaca{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Button>
        </div>
      </Surface>

      <Surface padding="lg">
        {query.isLoading ? (
          <div className="notification-list__loading">
            <Spinner />
            <span>Memuat notifikasi...</span>
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkRead={(id) => markRead.mutate(id)}
            onItemClick={handleItemClick}
          />
        )}

        {pagination && pagination.last_page > 1 ? (
          <div className="notification-page__pagination">
            <Button
              type="button"
              variant="neutral"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </Button>
            <span>
              Halaman {pagination.current_page} dari {pagination.last_page}
            </span>
            <Button
              type="button"
              variant="neutral"
              disabled={page >= pagination.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              Berikutnya
            </Button>
          </div>
        ) : null}
      </Surface>
    </div>
  )
}