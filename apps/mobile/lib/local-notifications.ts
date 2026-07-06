import {
  parseBroadcastNotificationPayload,
  type LocalNotificationPayload,
} from '@pengawas/shared/notification-broadcast'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export type { LocalNotificationPayload }
export { parseBroadcastNotificationPayload }

export function isNativeNotificationsSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

if (isNativeNotificationsSupported()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export async function ensureLocalNotificationPermissions(): Promise<boolean> {
  if (!isNativeNotificationsSupported()) return false
  if (!Device.isDevice) return false

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function configureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync('pengawas-default', {
    name: 'Notifikasi Pengawas',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ffcc00',
  })
}

export async function presentLocalNotification(payload: LocalNotificationPayload) {
  if (!isNativeNotificationsSupported()) return

  const granted = await ensureLocalNotificationPermissions()
  if (!granted) return

  await configureAndroidNotificationChannel()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.url ? { url: payload.url } : {},
      sound: true,
    },
    trigger: null,
  })
}

