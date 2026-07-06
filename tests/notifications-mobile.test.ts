import { describe, expect, it } from 'bun:test'
import { resolveNotificationLink } from '@pengawas/shared/notifications'

describe('resolveNotificationLink mobile', () => {
  it('maps dashboard and profile routes for mobile', () => {
    expect(resolveNotificationLink('/dashboard', 'mobile')).toEqual({
      kind: 'internal',
      path: '/(tabs)',
    })
    expect(resolveNotificationLink('/profile', 'mobile')).toEqual({
      kind: 'internal',
      path: '/(tabs)/profil',
    })
  })

  it('keeps pekerjaan detail route for mobile', () => {
    expect(resolveNotificationLink('/pekerjaan/421', 'mobile')).toEqual({
      kind: 'internal',
      path: '/pekerjaan/421',
    })
  })
})