import { describe, expect, test } from 'bun:test'
import { parseCoordinatesFromPickerExif } from '../apps/mobile/lib/image-gps-parse'

describe('mobile image gps', () => {
  test('parses picker EXIF latitude/longitude', () => {
    expect(
      parseCoordinatesFromPickerExif({
        GPSLatitude: -6.8172,
        GPSLongitude: 107.1382,
      }),
    ).toBe('-6.817200, 107.138200')
  })

  test('returns null when EXIF has no GPS block', () => {
    expect(parseCoordinatesFromPickerExif({ Make: 'Samsung' })).toBeNull()
  })
})