import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, ChevronLeft, UserCircle2 } from 'lucide-react-native'
import { useUnreadNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/lib/auth'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { colors, radius, shadows } from '@/theme/tokens'

type AppHeaderProps = {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
}

export function AppHeader({ title, subtitle, showBack = false, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets()
  const { user, canFetch } = useAuth()
  const [panelOpen, setPanelOpen] = useState(false)
  const unreadQuery = useUnreadNotifications(20_000, canFetch)
  const unreadCount = unreadQuery.data?.unread_count ?? 0

  const initials = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PG'

  return (
    <>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {showBack ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              style={{
                width: 40,
                height: 40,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={20} color={colors.foreground} strokeWidth={2.5} />
            </Pressable>
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius,
                backgroundColor: colors.main,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                source={require('../assets/arumanis.png')}
                style={{ width: 30, height: 30 }}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground }}>Arumanis Pengawasan</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => setPanelOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
            style={{
              width: 40,
              height: 40,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.card,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadows.sm,
            }}
          >
            <Bell size={18} color={colors.foreground} strokeWidth={2.5} />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: colors.danger,
                  borderWidth: 2,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/profil')}
            accessibilityRole="button"
            accessibilityLabel="Profil pengguna"
            style={{
              minWidth: 40,
              height: 40,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: radius,
              backgroundColor: colors.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <UserCircle2 size={18} color={colors.foreground} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.foreground }}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      <NotificationPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  )
}