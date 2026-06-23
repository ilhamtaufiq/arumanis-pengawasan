import { describe, expect, test } from 'bun:test'
import { formatKoordinat, parseKoordinatString } from '@/lib/koordinat-utils'

describe('koordinat utils', () => {
  test('parses decimal coordinate pair', () => {
    expect(parseKoordinatString('-6.794353, 107.228834')).toEqual({
      lat: -6.794353,
      lng: 107.228834,
    })
  })

  test('formats coordinate pair', () => {
    expect(formatKoordinat(-6.7943532, 107.2288341)).toBe('-6.794353, 107.228834')
  })

  test('rejects invalid coordinate string', () => {
    expect(parseKoordinatString('manual')).toBeNull()
  })
})