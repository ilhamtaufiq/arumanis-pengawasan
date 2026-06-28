import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import {
  extractNotificationList,
  useMarkNotificationRead,
  useUnreadNotifications,
} from '@/hooks/useNotifications'
import {
  isPopupNotification,
  notificationTypeMeta,
  resolveNotificationLink,
  resolveNotificationType,
  type AppNotification,
} from '@/lib/notifications'

type BannerNotificationProps = {
  /** true saat popup broadcast masih perlu ditampilkan atau data belum siap */
  onBlockingChange?: (blocking: boolean) => void
}

export function BannerNotification({ onBlockingChange }: BannerNotificationProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())

  const { data, isLoading } = useUnreadNotifications(30_000)
  const markRead = useMarkNotificationRead()

  const popupQueue = useMemo(() => {
    const notifications = extractNotificationList(data)
    return notifications.filter(
      (notification) =>
        isPopupNotification(notification) &&
        !notification.read_at &&
        !dismissedIds.has(notification.id),
    )
  }, [data, dismissedIds])

  useEffect(() => {
    if (isLoading) {
      onBlockingChange?.(true)
      return
    }

    if (popupQueue.length === 0) {
      setOpen(false)
      setCurrentNotification(null)
      onBlockingChange?.(false)
      return
    }

    onBlockingChange?.(true)

    const activeStillQueued = currentNotification
      ? popupQueue.some((notification) => notification.id === currentNotification.id)
      : false

    if (!currentNotification || !activeStillQueued) {
      const nextNotification = popupQueue[0]
      if (!nextNotification) {
        return
      }

      setCurrentNotification(nextNotification)
      setOpen(true)
    }
  }, [isLoading, popupQueue, currentNotification, onBlockingChange])

  function dismissCurrent(markAsRead: boolean) {
    if (!currentNotification) {
      return
    }

    if (markAsRead) {
      markRead.mutate(currentNotification.id)
    }

    setDismissedIds((current) => {
      const next = new Set(current)
      next.add(currentNotification.id)
      return next
    })
    setCurrentNotification(null)
    setOpen(false)
  }

  function handleClose() {
    dismissCurrent(false)
  }

  function handleDismiss() {
    dismissCurrent(true)
  }

  function handleAction() {
    if (!currentNotification) {
      return
    }

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
  const queuePosition = popupQueue.findIndex((notification) => notification.id === currentNotification.id)
  const queueTotal = popupQueue.length

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
          {queueTotal > 1 ? (
            <p className="notification-banner__queue">
              {queuePosition + 1} dari {queueTotal} pengumuman
            </p>
          ) : null}
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