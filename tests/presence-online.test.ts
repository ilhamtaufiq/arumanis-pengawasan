import { describe, expect, test } from 'bun:test'
import {
  countPengawasPresenceOnline,
  mapPresenceToLocationPoints,
  type PresenceOnlineUser,
} from '@pengawas/shared/presence'

const sampleUsers: PresenceOnlineUser[] = [
  {
    id: 1,
    name: 'Budi',
    email: 'budi@example.com',
    app: 'pengawasan',
    last_seen_at: '2026-07-06T10:00:00+07:00',
    koordinat: '-6.917500, 107.619100',
    koordinat_at: '2026-07-06T10:00:00+07:00',
  },
  {
    id: 2,
    name: 'Ani',
    email: 'ani@example.com',
    app: 'pengawasan',
    last_seen_at: '2026-07-06T10:01:00+07:00',
    koordinat: null,
    koordinat_at: null,
  },
  {
    id: 3,
    name: 'Portal User',
    email: 'portal@example.com',
    app: 'portal',
    last_seen_at: '2026-07-06T10:02:00+07:00',
    koordinat: '-6.900000, 107.600000',
    koordinat_at: '2026-07-06T10:02:00+07:00',
  },
]

describe('presence online helpers', () => {
  test('maps only pengawasan users with valid koordinat', () => {
    const points = mapPresenceToLocationPoints(sampleUsers)
    expect(points).toHaveLength(1)
    expect(points[0]?.name).toBe('Budi')
    expect(points[0]?.lat).toBeCloseTo(-6.9175, 4)
    expect(points[0]?.lng).toBeCloseTo(107.6191, 4)
  })

  test('counts online pengawas with and without koordinat', () => {
    expect(countPengawasPresenceOnline(sampleUsers)).toEqual({
      online: 2,
      withKoordinat: 1,
      withoutKoordinat: 1,
    })
  })
})