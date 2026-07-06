import { describe, expect, it } from 'bun:test'
import { parseBroadcastNotificationPayload } from '@pengawas/shared/notification-broadcast'

describe('parseBroadcastNotificationPayload', () => {
  it('maps broadcast payload to local notification', () => {
    expect(
      parseBroadcastNotificationPayload({
        title: 'Pekerjaan diperbarui',
        message: 'Foto baru diunggah',
        url: '/pekerjaan/12',
        type: 'info',
      }),
    ).toEqual({
      title: 'Pekerjaan diperbarui',
      body: 'Foto baru diunggah',
      url: '/pekerjaan/12',
    })
  })

  it('returns null for empty payload', () => {
    expect(parseBroadcastNotificationPayload({})).toBeNull()
    expect(parseBroadcastNotificationPayload(null)).toBeNull()
  })

  it('falls back title when only message exists', () => {
    expect(parseBroadcastNotificationPayload({ message: 'Halo pengawas' })).toEqual({
      title: 'Notifikasi Pengawas',
      body: 'Halo pengawas',
    })
  })
})