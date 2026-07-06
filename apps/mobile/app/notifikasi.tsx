import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import type { AppNotification } from '@pengawas/shared/notifications'
import { resolveNotificationLink } from '@pengawas/shared/notifications'
import { NotificationList } from '@/components/notifications/NotificationList'
import {
  extractNotificationList,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
} from '@/hooks/useNotifications'
import { useAuth } from '@/lib/auth'
import { AppHeader } from '@/components/AppHeader'
import { NeoButton, NeoSurface, PaginationBar, Spinner } from '@/components/ui'
import { colors } from '@/theme/tokens'

export default function NotifikasiScreen() {
  const { canFetch } = useAuth()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)

  const unreadOnly = filter === 'unread'
  const query = useNotificationList(unreadOnly, page, canFetch)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = extractNotificationList(query.data)
  const unreadCount = query.data?.unread_count ?? 0
  const pagination = query.data?.pagination

  function handleItemPress(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }

    const link = resolveNotificationLink(notification.data.url, 'mobile')
    if (link?.kind === 'internal') {
      router.push(link.path as never)
      return
    }

    if (link?.kind === 'external') {
      void Linking.openURL(link.href)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Notifikasi" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <NeoSurface style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '800' }}>Pusat notifikasi</Text>
            <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>
              Pengumuman dan broadcast dari pusat Arumanis untuk akun Anda.
            </Text>
          </View>

          {unreadCount > 0 ? (
            <NeoButton
              label="Tandai semua dibaca"
              variant="neutral"
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <NeoButton
              label="Semua"
              variant={filter === 'all' ? 'primary' : 'ghost'}
              compact
              onPress={() => {
                setFilter('all')
                setPage(1)
              }}
            />
            <NeoButton
              label={unreadCount > 0 ? `Belum dibaca (${unreadCount})` : 'Belum dibaca'}
              variant={filter === 'unread' ? 'primary' : 'ghost'}
              compact
              onPress={() => {
                setFilter('unread')
                setPage(1)
              }}
            />
          </View>
        </NeoSurface>

        <NeoSurface>
          {query.isLoading ? (
            <Spinner label="Memuat notifikasi..." />
          ) : (
            <NotificationList
              notifications={notifications}
              onMarkRead={(id) => markRead.mutate(id)}
              onItemPress={handleItemPress}
            />
          )}
        </NeoSurface>

        {pagination && pagination.last_page > 1 ? (
          <PaginationBar
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
          />
        ) : null}
      </ScrollView>
    </View>
  )
}