import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import {
  extractNotificationList,
  useMarkNotificationRead,
  useUnreadNotifications,
} from '@/hooks/useNotifications'
import {
  isBannerNotification,
  notificationTypeMeta,
  resolveNotificationLink,
  resolveNotificationType,
  type AppNotification,
} from '@/lib/notifications'

export function BannerNotification() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null)
  const [sessionDismissed, setSessionDismissed] = useState<string | null>(null)

  const { data } = useUnreadNotifications(30_000)
  const markRead = useMarkNotificationRead()

  useEffect(() => {
    const notifications = extractNotificationList(data)
    const bannerNotif = notifications.find(
      (notification) =>
        isBannerNotification(notification.data.is_banner) &&
        !notification.read_at &&
        sessionDismissed !== notification.id,
    )

    if (bannerNotif && !currentNotification) {
      setCurrentNotification(bannerNotif)
      setOpen(true)
    }
  }, [data, currentNotification, sessionDismissed])

  function handleClose() {
    if (currentNotification) {
      setSessionDismissed(currentNotification.id)
    }
    setOpen(false)
    setCurrentNotification(null)
  }

  function handleDismiss() {
    if (currentNotification) {
      markRead.mutate(currentNotification.id)
    }
    setOpen(false)
    setCurrentNotification(null)
  }

  function handleAction() {
    if (!currentNotification) return

    const link = resolveNotificationLink(currentNotification.data.url)
    if (link?.kind === 'internal') {
      navigate(link.path)
    } else if (link?.kind === 'external') {
      window.open(link.href, '_blank', 'noopener,noreferrer')
    }

    handleDismiss()
  }

  if (!open || !currentNotification) {
    return null
  }

  const type = resolveNotificationType(currentNotification.data.type)
  const meta = notificationTypeMeta[type]
  const link = resolveNotificationLink(currentNotification.data.url)

  return (
    <div className="modal-backdrop notification-banner-backdrop" role="presentation" onClick={handleClose}>
      <div
        className={`modal-shell notification-banner notification-banner--${meta.tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notification-banner-title"
        aria-describedby="notification-banner-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="notification-banner__hero">
          <Badge tone={meta.tone}>Pengumuman Penting</Badge>
          <h2 id="notification-banner-title" className="notification-banner__title">
            {currentNotification.data.title}
          </h2>
        </div>

        <p id="notification-banner-description" className="notification-banner__message">
          {currentNotification.data.message}
        </p>

        <div className="modal-actions notification-banner__actions">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Tutup (nanti)
          </Button>
          {link ? (
            <Button type="button" variant="neutral" onClick={handleAction}>
              <ExternalLink size={14} />
              {link.kind === 'external' ? 'Buka tautan' : 'Lihat detail'}
            </Button>
          ) : null}
          <Button type="button" variant="primary" onClick={handleDismiss}>
            Saya mengerti
          </Button>
        </div>
      </div>
    </div>
  )
}