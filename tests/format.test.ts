import { describe, expect, test } from 'bun:test'
import { ApiError, formatApiError, unwrapCollection, unwrapEntity } from '@/lib/api'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'

describe('format helpers', () => {
  test('formats currency', () => {
    expect(formatCurrency(1500000)).toContain('1.500.000')
  })

  test('formats percent', () => {
    expect(formatPercent(12.345)).toBe('12.3%')
  })

  test('formats date', () => {
    expect(formatDate('2026-06-01T00:00:00.000Z')).toMatch(/2026/)
  })
})

describe('formatApiError', () => {
  test('combines base message and validation errors', () => {
    const error = new ApiError('The given data was invalid.', 422, {
      message: 'The file field is required.',
      errors: {
        file: ['The file field is required.'],
        koordinat: ['The koordinat field is required.'],
      },
    })

    expect(formatApiError(error)).toBe('The file field is required.\nThe koordinat field is required.')
  })
})

describe('api envelope helpers', () => {
  test('unwrap entity', () => {
    expect(unwrapEntity<{ id: number; name: string }>({ data: { id: 1, name: 'A' } })).toEqual({
      id: 1,
      name: 'A',
    })
  })

  test('unwrap collection', () => {
    expect(unwrapCollection<{ id: number }>({ data: [{ id: 1 }] }).data).toHaveLength(1)
  })
})
