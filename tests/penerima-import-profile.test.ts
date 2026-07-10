import { describe, expect, test } from 'bun:test'
import {
  getKomunalImportHeaders,
  getPenerimaImportProfile,
  getUnitImportHeaders,
} from '@/lib/penerima-import'
import type { Output } from '@/lib/types'

describe('getPenerimaImportProfile', () => {
  test('returns unit profile when penerima is required', () => {
    const profile = getPenerimaImportProfile({
      id: 1,
      komponen: 'Sambungan Rumah',
      satuan: 'Unit',
      volume: 10,
      penerima_is_optional: false,
    } as Output)

    expect(profile.type).toBe('unit')
    expect(profile.targetRows).toBe(10)
    expect(profile.komponenId).toBe(1)
  })

  test('returns komunal profile when penerima is optional', () => {
    const profile = getPenerimaImportProfile({
      id: 2,
      komponen: 'Reservoir',
      satuan: 'Unit',
      volume: 2,
      penerima_is_optional: true,
    } as Output)

    expect(profile.type).toBe('komunal')
    expect(profile.targetRows).toBe(2)
  })

  test('includes five foto progress columns in headers', () => {
    const unitHeaders = getUnitImportHeaders()
    const komunalHeaders = getKomunalImportHeaders()

    expect(unitHeaders).toContain('nama_file_foto_0')
    expect(unitHeaders).toContain('nama_file_foto_100')
    expect(komunalHeaders).toContain('nama_file_foto_25')
    expect(komunalHeaders).toContain('nama_file_foto_75')
  })
})
