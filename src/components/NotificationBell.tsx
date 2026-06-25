import { Bell, CheckCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnchorButton, Button } from '@/components/ui'
import {
  extractNotificationList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotifications,
} from '@/hooks/useNotifications'
import {
  resolveNotificationLink,
  type AppNotification,
} from '@/lib/notifications'
import { NotificationList } from '@/components/NotificationList'

export function NotificationBell() {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useUnreadNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = extractNotificationList(data)
  const unreadCount = data?.unread_count ?? 0

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function handleItemClick(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }

    const link = resolveNotificationLink(notification.data.url)
    if (link?.kind === 'internal') {
      setOpen(false)
      navigate(link.path)
      return
    }

    if (link?.kind === 'external') {
      window.open(link.href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <Button
        type="button"
        variant="neutral"
        className="notification-bell__trigger"
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="notification-bell__badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="notification-bell__panel" role="dialog" aria-label="Daftar notifikasi">
          <div className="notification-bell__header">
            <div>
              <strong>Notifikasi</strong>
              <p>{unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}</p>
            </div>
            <div className="notification-bell__header-actions">
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => markAllRead.mutate()}
                  isLoading={markAllRead.isPending}
                >
                  <CheckCheck size={14} />
                  Tandai semua
                </Button>
              ) : null}
              <Button type="button" variant="ghost" aria-label="Tutup panel notifikasi" onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>
          </div>

          <div className="notification-bell__body">
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              compact
              emptyTitle="Tidak ada notifikasi baru"
              emptyDescription="Pengumuman broadcast dari pusat akan muncul di sini."
              onMarkRead={(id) => markRead.mutate(id)}
              onItemClick={handleItemClick}
            />
          </div>

          <div className="notification-bell__footer">
            <AnchorButton variant="ghost" to="/notifikasi" onClick={() => setOpen(false)}>
              Lihat semua notifikasi
            </AnchorButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}