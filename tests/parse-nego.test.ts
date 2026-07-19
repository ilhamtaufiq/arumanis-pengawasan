import { describe, expect, it } from 'bun:test'
import {
  detectNegoColumns,
  parseNegoRows,
} from '../src/lib/nego-import/parse-nego'
import {
  parseNegoPdfItemLine,
  parseNegoPdfLines,
  extractPdfNegoGrandTotal,
} from '../src/lib/nego-import/parse-nego-pdf'
import { parseIndonesianNumber } from '../src/lib/nego-import/parse-indonesian-number'

describe('parseIndonesianNumber', () => {
  it('parses ribuan and desimal Indonesia', () => {
    expect(parseIndonesianNumber('1.500.000')).toBe(1500000)
    expect(parseIndonesianNumber('0,84')).toBe(0.84)
    expect(parseIndonesianNumber('Rp 2.480.825')).toBe(2480825)
  })
})

describe('parse-nego excel', () => {
  it('detects nego harga column as rightmost harga', () => {
    const header = [
      'No.',
      'Uraian Pekerjaan',
      '',
      'Satuan',
      'Volume',
      'Harga',
      'Jumlah Harga',
      'Harga',
      'Jumlah Harga',
      'Harga',
      'Jumlah Harga',
    ]
    const layout = detectNegoColumns(header)
    expect(layout.desc).toBe(1)
    expect(layout.satuan).toBe(3)
    expect(layout.volume).toBe(4)
    expect(layout.hargaNego).toBe(9)
  })

  it('parses Hasil Nego rows with negotiation unit price', () => {
    const rows = [
      ['HASIL NEGOSIASI'],
      ['', '', '', '', '', 'HPS', '', 'Penawaran', '', 'Negosiasi'],
      [
        'No.',
        'Uraian Pekerjaan',
        '',
        'Satuan',
        'Volume',
        'Harga',
        'Jumlah Harga',
        'Harga',
        'Jumlah Harga',
        'Harga',
        'Jumlah Harga',
      ],
      ['I.', 'PEKERJAAN PERSIAPAN'],
      ['', 'Pembersihan Lokasi', '', 'ls', 1, 300000, 333000, 300000, 333000, 295643, 328163.73],
      ['', 'Papan Nama Proyek', '', 'bh', 1, 250000, 277500, 250000, 277500, 200000, 222000],
    ]

    const items = parseNegoRows(rows)
    expect(items.length).toBe(2)
    expect(items[0]?.uraian).toContain('Pembersihan')
    expect(items[0]?.hargaSatuan).toBe(295643)
    expect(items[0]?.grup).toMatch(/PERSIAPAN/i)
    expect(items[1]?.hargaSatuan).toBe(200000)
  })
})

describe('parse-nego pdf', () => {
  it('parses item line with nego unit price', () => {
    const line =
      '1 Galian tanah m3 12,5 150.000 11 16.500 2.081.250 140.000 11 15.400 1.942.500'
    const item = parseNegoPdfItemLine(line, 'Pekerjaan Tanah')
    expect(item).not.toBeNull()
    expect(item?.uraian).toBe('Galian tanah')
    expect(item?.satuan).toBe('m³')
    expect(item?.volume).toBe(12.5)
    expect(item?.hargaSatuan).toBe(140000)
  })

  it('groups items and reads TOTAL NILAI NEGOSIASI', () => {
    const lines = [
      'PEKERJAAN PERSIAPAN',
      '1 Mobilisasi ls 1 1.000.000 11 110.000 1.110.000 900.000 11 99.000 999.000',
      'TOTAL NILAI NEGOSIASI 1.234.567,00',
    ]
    const items = parseNegoPdfLines(lines)
    expect(items.length).toBe(1)
    expect(items[0]?.grup).toBe('PEKERJAAN PERSIAPAN')
    expect(items[0]?.hargaSatuan).toBe(900000)
    expect(extractPdfNegoGrandTotal(lines)).toBe(1234567)
  })
})
