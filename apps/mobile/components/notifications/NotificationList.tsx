import { Pressable, Text, View } from 'react-native'
import type { AppNotification } from '@pengawas/shared/notifications'
import {
  notificationTypeMeta,
  resolveNotificationLink,
  resolveNotificationType,
} from '@pengawas/shared/notifications'
import { formatDateTime } from '@pengawas/shared/format'
import { EmptyState, NeoBadge, NeoButton, Spinner } from '@/components/ui'
import { colors, radius } from '@/theme/tokens'

type NotificationListProps = {
  notifications: AppNotification[]
  isLoading?: boolean
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onMarkRead?: (id: string) => void
  onItemPress?: (notification: AppNotification) => void
}

export function NotificationList({
  notifications,
  isLoading = false,
  compact = false,
  emptyTitle = 'Belum ada notifikasi',
  emptyDescription = 'Pengumuman dari pusat akan muncul di sini.',
  onMarkRead,
  onItemPress,
}: NotificationListProps) {
  if (isLoading) {
    return <Spinner label="Memuat notifikasi..." />
  }

  if (notifications.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <View style={{ gap: compact ? 8 : 12 }}>
      {notifications.map((notification) => {
        const type = resolveNotificationType(notification.data.type)
        const meta = notificationTypeMeta[type]
        const link = resolveNotificationLink(notification.data.url, 'mobile')
        const isUnread = !notification.read_at

        return (
          <Pressable
            key={notification.id}
            onPress={() => onItemPress?.(notification)}
            style={{
              gap: 8,
              padding: compact ? 10 : 12,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: isUnread ? colors.main : colors.card,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <NeoBadge tone={meta.tone}>{meta.label}</NeoBadge>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: '600' }}>
                {formatDateTime(notification.created_at)}
              </Text>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: compact ? 14 : 16, fontWeight: '800', color: colors.foreground }}>
                {notification.data.title}
              </Text>
              <Text style={{ fontSize: compact ? 12 : 14, color: colors.mutedForeground, lineHeight: 20 }}>
                {notification.data.message}
              </Text>
            </View>

            {onMarkRead && isUnread ? (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {link ? (
                  <NeoButton
                    label={link.kind === 'external' ? 'Buka tautan' : 'Buka'}
                    variant="neutral"
                    compact
                    onPress={() => onItemPress?.(notification)}
                  />
                ) : null}
                <NeoButton
                  label="Tandai dibaca"
                  variant="ghost"
                  compact
                  onPress={() => onMarkRead(notification.id)}
                />
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}