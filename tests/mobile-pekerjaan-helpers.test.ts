import { describe, expect, test } from 'bun:test'
import { buildFotoMatrix } from '../apps/mobile/lib/pekerjaan-helpers'
import type { Foto, Output, Penerima } from '@pengawas/shared'

const outputUnit: Output = {
  id: 1,
  komponen: 'Sambungan Rumah',
  satuan: 'Unit',
  volume: 2,
  penerima_is_optional: false,
}

const outputKomunal: Output = {
  id: 2,
  komponen: 'Reservoir',
  satuan: 'Unit',
  volume: 1,
  penerima_is_optional: true,
}

const penerima: Penerima[] = [
  { id: 10, nama: 'A' },
  { id: 11, nama: 'B' },
]

const fotos: Foto[] = [
  { id: 100, komponen_id: 1, penerima_id: 10, keterangan: '0%' },
  { id: 101, komponen_id: 1, penerima_id: 10, keterangan: '50%' },
  { id: 102, komponen_id: 1, penerima_id: 11, keterangan: '100%' },
  { id: 103, komponen_id: 2, penerima_id: null, keterangan: '25%' },
]

describe('buildFotoMatrix', () => {
  test('maps unit outputs per penerima with slot lookup', () => {
    const matrix = buildFotoMatrix([outputUnit], fotos, penerima)
    expect(matrix).toHaveLength(2)

    const rowA = matrix[0]
    expect(rowA?.penerima?.id).toBe(10)
    expect(rowA?.count).toBe(2)
    expect(rowA?.slots.find((s) => s.slot === '0%')?.foto?.id).toBe(100)
    expect(rowA?.slots.find((s) => s.slot === '50%')?.foto?.id).toBe(101)
    expect(rowA?.slots.find((s) => s.slot === '25%')?.foto).toBeUndefined()

    const rowB = matrix[1]
    expect(rowB?.penerima?.id).toBe(11)
    expect(rowB?.count).toBe(1)
    expect(rowB?.slots.find((s) => s.slot === '100%')?.foto?.id).toBe(102)
  })

  test('maps komunal output without penerima rows', () => {
    const matrix = buildFotoMatrix([outputKomunal], fotos, penerima)
    expect(matrix).toHaveLength(1)
    expect(matrix[0]?.penerima).toBeUndefined()
    expect(matrix[0]?.count).toBe(1)
    expect(matrix[0]?.slots.find((s) => s.slot === '25%')?.foto?.id).toBe(103)
  })
})
