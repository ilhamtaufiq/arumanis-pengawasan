import { describe, expect, test } from 'bun:test'
import { normalizeOcrText, parseCoordinatesFromText } from '../src/lib/image-gps-utils'

describe('parseCoordinatesFromText', () => {
  test('parses GPS Map Camera Lat/Long watermark', () => {
    expect(parseCoordinatesFromText('Lat -6.794353, Long 107.228834')).toBe('-6.794353, 107.228834')
  })

  test('parses watermark when OCR drops minus after Lat label', () => {
    expect(parseCoordinatesFromText('Lat 6.794353, Long 107.228834')).toBe('-6.794353, 107.228834')
  })

  test('parses timestamp compass watermark with S/E suffix', () => {
    expect(parseCoordinatesFromText('7.23865417S 107.1541178E ±3,79m')).toBe('-7.238654, 107.154118')
  })

  test('parses garbled OCR from timestamp compass watermark', () => {
    expect(parseCoordinatesFromText('52 7 17238654175 107] 541378 +379m')).toBe('-7.238654, 107.154138')
  })

  test('parses OCR typo Laf instead of Lat', () => {
    expect(parseCoordinatesFromText('Laf -6.794353 Long 107.228834')).toBe('-6.794353, 107.228834')
  })

  test('parses degree suffix watermark', () => {
    expect(parseCoordinatesFromText('-6.794353° S 107.228834° E')).toBe('-6.794353, 107.228834')
  })

  test('parses concatenated OCR output without comma', () => {
    expect(parseCoordinatesFromText('-7.1653984107.1545166')).toBe('-7.165398, 107.154517')
  })

  test('returns null for unrelated OCR noise', () => {
    expect(parseCoordinatesFromText('foto progres pekerjaan minggu 12')).toBeNull()
  })
})

describe('normalizeOcrText', () => {
  test('fixes common OCR mistakes', () => {
    expect(normalizeOcrText('Laf  -6.79 | Long 107.22')).toBe('Lat -6.79 Long 107.22')
  })
})