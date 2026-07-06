import { describe, expect, it } from 'bun:test'
import {
  formatKoordinat,
  hasParsableKoordinat,
  isManualOrEmptyKoordinat,
  parseKoordinatLoose,
} from '@pengawas/shared/koordinat'

describe('koordinat helpers', () => {
  it('detects manual or empty values', () => {
    expect(isManualOrEmptyKoordinat('')).toBe(true)
    expect(isManualOrEmptyKoordinat('manual')).toBe(true)
    expect(isManualOrEmptyKoordinat('MANUAL')).toBe(true)
    expect(isManualOrEmptyKoordinat('-6.794353, 107.228834')).toBe(false)
  })

  it('parses loose coordinate strings', () => {
    const parsed = parseKoordinatLoose('-7.1653984107.1545166')
    expect(parsed).not.toBeNull()
    expect(parsed?.lat).toBeCloseTo(-7.1653984, 6)
    expect(parsed?.lng).toBeCloseTo(107.1545166, 6)
  })

  it('requires parsable coordinates for upload readiness', () => {
    expect(hasParsableKoordinat('manual')).toBe(false)
    expect(hasParsableKoordinat('not-valid')).toBe(false)
    expect(hasParsableKoordinat(formatKoordinat(-6.794353, 107.228834))).toBe(true)
  })
})