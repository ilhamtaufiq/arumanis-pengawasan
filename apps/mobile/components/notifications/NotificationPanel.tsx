import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import { useAuth } from '@/lib/auth'
import type { AppNotification } from '@pengawas/shared/notifications'
import { resolveNotificationLink } from '@pengawas/shared/notifications'
import {
  extractNotificationList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotifications,
} from '@/hooks/useNotifications'
import { NotificationList } from '@/components/notifications/NotificationList'
import { NeoButton, NeoSurface } from '@/components/ui'
import { colors } from '@/theme/tokens'

type NotificationPanelProps = {
  visible: boolean
  onClose: () => void
}

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const { canFetch } = useAuth()
  const { data, isLoading } = useUnreadNotifications(20_000, canFetch && visible)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = extractNotificationList(data)
  const unreadCount = data?.unread_count ?? 0

  function handleItemPress(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }

    const link = resolveNotificationLink(notification.data.url, 'mobile')
    if (link?.kind === 'internal') {
      onClose()
      router.push(link.path as never)
      return
    }

    if (link?.kind === 'external') {
      void Linking.openURL(link.href)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(17, 17, 17, 0.72)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '78%' }}>
          <NeoSurface shadow="lg" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>Notifikasi</Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                </Text>
              </View>
              {unreadCount > 0 ? (
                <NeoButton
                  label="Tandai semua"
                  variant="ghost"
                  compact
                  onPress={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                />
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              <NotificationList
                notifications={notifications}
                isLoading={isLoading}
                compact
                emptyTitle="Tidak ada notifikasi baru"
                emptyDescription="Pengumuman broadcast dari pusat akan muncul di sini."
                onMarkRead={(id) => markRead.mutate(id)}
                onItemPress={handleItemPress}
              />
            </ScrollView>

            <NeoButton
              label="Lihat semua notifikasi"
              variant="neutral"
              onPress={() => {
                onClose()
                router.push('/notifikasi')
              }}
            />
          </NeoSurface>
        </Pressable>
      </Pressable>
    </Modal>
  )
}