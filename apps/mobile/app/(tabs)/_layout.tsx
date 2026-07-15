import { useCallback, useMemo } from 'react'
import { Tabs } from 'expo-router'
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime'
import { usePengawasRealtime } from '@/hooks/usePengawasRealtime'
import { AppHeader } from '@/components/AppHeader'
import { createRouteErrorBoundary } from '@/lib/route-error-boundary'

export const ErrorBoundary = createRouteErrorBoundary('Layar utama')
import { ClipboardList, LayoutDashboard, MapPin, MessageSquareText } from 'lucide-react-native'
import { Platform, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, shadows } from '@/theme/tokens'

function TabsStackHeader({ options }: { options: BottomTabNavigationOptions }) {
  return <AppHeader title={String(options.title ?? 'Pengawas')} />
}

function TabIcon({
  Icon,
  focused,
  compact,
}: {
  Icon: typeof LayoutDashboard
  focused: boolean
  compact: boolean
}) {
  const size = compact ? 18 : 20
  const pad = compact ? 4 : 6

  return (
    <View
      style={[
        {
          padding: pad,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: 6,
          backgroundColor: focused ? colors.main : colors.card,
        },
        focused ? null : shadows.sm,
      ]}
    >
      <Icon size={size} color={colors.foreground} strokeWidth={2.5} />
    </View>
  )
}

function TabsRealtimeBridge() {
  usePengawasRealtime()
  useNotificationRealtime()
  return null
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const compact = width < 400
  const bottomInset = Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8)

  const screenOptions = useMemo<BottomTabNavigationOptions>(
    () => ({
      header: TabsStackHeader,
      lazy: true,
      freezeOnBlur: true,
      tabBarActiveTintColor: colors.foreground,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarShowLabel: !compact || width >= 340,
      tabBarItemStyle: {
        flex: 1,
        paddingVertical: 4,
        minWidth: 0,
      },
      tabBarLabelStyle: {
        fontWeight: '700',
        fontSize: compact ? 10 : 11,
        marginTop: 2,
      },
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopWidth: 2,
        borderTopColor: colors.border,
        height: (compact ? 56 : 60) + bottomInset,
        paddingBottom: bottomInset,
        paddingTop: 6,
        paddingHorizontal: compact ? 4 : 8,
      },
    }),
    [bottomInset, compact, width],
  )

  const dashboardIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon Icon={LayoutDashboard} focused={focused} compact={compact} />
    ),
    [compact],
  )

  const pekerjaanIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon Icon={ClipboardList} focused={focused} compact={compact} />
    ),
    [compact],
  )

  const tiketIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon Icon={MessageSquareText} focused={focused} compact={compact} />
    ),
    [compact],
  )

  const lapanganIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon Icon={MapPin} focused={focused} compact={compact} />
    ),
    [compact],
  )

  return (
    <>
      <TabsRealtimeBridge />
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: compact ? 'Home' : 'Dashboard',
            tabBarIcon: dashboardIcon,
          }}
        />
        <Tabs.Screen
          name="pekerjaan"
          options={{
            title: 'Pekerjaan',
            tabBarIcon: pekerjaanIcon,
            tabBarLabel: compact ? 'Kerja' : 'Pekerjaan',
          }}
        />
        <Tabs.Screen
          name="lapangan"
          options={{
            title: 'Lapangan',
            tabBarIcon: lapanganIcon,
            tabBarLabel: compact ? 'Lapang' : 'Lapangan',
          }}
        />
        <Tabs.Screen
          name="tiket"
          options={{
            title: 'Tiket',
            tabBarIcon: tiketIcon,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: 'Profil',
            href: null,
          }}
        />
      </Tabs>
    </>
  )
}