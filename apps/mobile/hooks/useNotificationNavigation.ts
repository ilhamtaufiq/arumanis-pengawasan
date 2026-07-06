import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import { useEffect, useRef } from 'react'
import { resolveNotificationLink } from '@pengawas/shared/notifications'
import {
  configureAndroidNotificationChannel,
  ensureLocalNotificationPermissions,
  isNativeNotificationsSupported,
} from '@/lib/local-notifications'
import { useAuth } from '@/lib/auth'

function navigateFromNotificationUrl(url?: string) {
  const link = resolveNotificationLink(url, 'mobile')
  if (link?.kind === 'internal') {
    router.push(link.path as never)
    return
  }

  if (link?.kind === 'external') {
    void Linking.openURL(link.href)
  }
}

export function useNotificationNavigation() {
  const { canFetch } = useAuth()
  const handledColdStart = useRef(false)

  useEffect(() => {
    if (!canFetch) {
      handledColdStart.current = false
      return
    }

    if (!isNativeNotificationsSupported()) {
      return
    }

    void ensureLocalNotificationPermissions()
    void configureAndroidNotificationChannel()

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url
      navigateFromNotificationUrl(typeof url === 'string' ? url : undefined)
    })

    if (!handledColdStart.current) {
      handledColdStart.current = true
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return
        const url = response.notification.request.content.data?.url
        navigateFromNotificationUrl(typeof url === 'string' ? url : undefined)
      })
    }

    return () => {
      responseSub.remove()
    }
  }, [canFetch])
}