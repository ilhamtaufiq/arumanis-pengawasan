import { describe, expect, it } from 'bun:test'
import {
  hasBroadcastHistory,
  isBannerNotification,
  isPopupNotification,
  resolveNotificationLink,
} from '../src/lib/notifications'

describe('notifications helpers', () => {
  it('maps bun routes to pengawas routes', () => {
    expect(resolveNotificationLink('/notifications')).toEqual({
      kind: 'internal',
      path: '/notifikasi',
    })
    expect(resolveNotificationLink('/pekerjaan/42')).toEqual({
      kind: 'internal',
      path: '/pekerjaan/42',
    })
    expect(resolveNotificationLink('/dashboard')).toEqual({
      kind: 'internal',
      path: '/',
    })
  })

  it('detects banner flag variants', () => {
    expect(isBannerNotification(true)).toBe(true)
    expect(isBannerNotification('1')).toBe(true)
    expect(isBannerNotification(false)).toBe(false)
  })

  it('detects broadcast popup notifications', () => {
    const reminder = {
      data: {
        title: 'Pengingat',
        message: 'Lengkapi data',
        broadcast_history_id: 12,
      },
    }

    expect(hasBroadcastHistory(reminder)).toBe(true)
    expect(isPopupNotification(reminder)).toBe(true)
    expect(
      isPopupNotification({
        data: {
          title: 'Penugasan',
          message: 'Anda di-assign',
        },
      }),
    ).toBe(false)
  })
})