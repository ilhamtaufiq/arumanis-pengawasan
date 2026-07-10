import { describe, expect, test } from 'bun:test'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { parsePenerimaExcelFile } from '@/lib/penerima-import'
import type { Output } from '@/lib/types'

const unitOutput: Output = {
  id: 10,
  pekerjaan_id: 1,
  komponen: 'Sambungan Rumah',
  satuan: 'unit',
  volume: 3,
  penerima_is_optional: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const komunalOutput: Output = {
  id: 11,
  pekerjaan_id: 1,
  komponen: 'Reservoir',
  satuan: 'unit',
  volume: 2,
  penerima_is_optional: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

async function buildExcelBlob(sheets: Record<string, unknown[][]>): Promise<File> {
  const workbook = XLSX.utils.book_new()
  Object.entries(sheets).forEach(([name, rows]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  })
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([new Uint8Array(buffer)], 'test-penerima.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

async function buildZipWithImages(filenames: string[]): Promise<File> {
  const zip = new JSZip()
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
  filenames.forEach((filename) => {
    zip.file(filename, jpegHeader)
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], 'foto.zip', { type: 'application/zip' })
}

describe('parsePenerimaExcelFile', () => {
  test('parses unit template rows', async () => {
    const file = await buildExcelBlob({
      Info: [
        ['komponen_id', 'komponen', 'satuan', 'volume', 'tipe_import', 'target_baris'],
        [10, 'Sambungan Rumah', 'unit', 3, 'unit', 3],
      ],
      Data: [
        ['no', 'nama', 'nik', 'alamat', 'jumlah_jiwa', 'latitude', 'longitude', 'nama_file_foto_0'],
        [1, 'Arhan', '3203320508910001', 'Kp. Bojong Jati RT 01/02', 4, -7.238694, 107.154107, '001_0.jpg'],
      ],
    })

    const result = await parsePenerimaExcelFile(file, null, unitOutput)
    const row = result.rows[0]
    expect(result.profile?.type).toBe('unit')
    expect(row?.nama).toBe('Arhan')
    expect(row?.jumlah_jiwa).toBe(4)
    expect(row?.fotoSlots).toHaveLength(1)
    expect(row?.fotoSlots[0]?.level).toBe('0%')
  })

  test('parses komunal template rows without nik/alamat', async () => {
    const file = await buildExcelBlob({
      Info: [
        ['komponen_id', 'komponen', 'satuan', 'volume', 'tipe_import', 'target_baris'],
        [11, 'Reservoir', 'unit', 2, 'komunal', 2],
      ],
      Data: [
        ['no', 'unit_index', 'label', 'latitude', 'longitude', 'nama_file_foto_0'],
        [1, 1, 'Unit 1', -6.676555, 107.052271, '001_0.jpg'],
      ],
    })

    const result = await parsePenerimaExcelFile(file, null, komunalOutput)
    const row = result.rows[0]
    expect(result.profile?.type).toBe('komunal')
    expect(row?.unitIndex).toBe(1)
    expect(row?.nik).toBe('')
    expect(row?.alamat).toBe('')
  })

  test('matches legacy nama_file_foto column as 0%', async () => {
    const excel = await buildExcelBlob({
      Data: [
        ['nama', 'latitude', 'longitude', 'nama_file_foto'],
        ['Dama', -6.676555, 107.052271, '001.jpg'],
      ],
    })
    const zip = await buildZipWithImages(['001.jpg'])

    const result = await parsePenerimaExcelFile(excel, zip, unitOutput)
    const slot = result.rows[0]?.fotoSlots[0]
    expect(slot?.level).toBe('0%')
    expect(slot?.imageFile).not.toBeNull()
    expect(result.totalImages).toBe(1)
  })

  test('parses all progress foto slots from zip', async () => {
    const excel = await buildExcelBlob({
      Data: [
        [
          'nama',
          'latitude',
          'longitude',
          'nama_file_foto_0',
          'nama_file_foto_25',
          'nama_file_foto_50',
          'nama_file_foto_75',
          'nama_file_foto_100',
        ],
        [
          'Dama',
          -6.676555,
          107.052271,
          '001_0.jpg',
          '001_25.jpg',
          '001_50.jpg',
          '001_75.jpg',
          '001_100.jpg',
        ],
      ],
    })
    const zip = await buildZipWithImages([
      '001_0.jpg',
      '001_25.jpg',
      '001_50.jpg',
      '001_75.jpg',
      '001_100.jpg',
    ])

    const result = await parsePenerimaExcelFile(excel, zip, unitOutput)
    const row = result.rows[0]
    expect(row?.fotoSlots).toHaveLength(5)
    expect(row?.fotoSlots.map((slot) => slot.level)).toEqual([
      '0%',
      '25%',
      '50%',
      '75%',
      '100%',
    ])
    expect(result.totalImages).toBe(5)
  })
})
