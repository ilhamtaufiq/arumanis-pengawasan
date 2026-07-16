import { describe, expect, it } from 'bun:test'
import {
  formatLokasiWilayah,
  formatPekerjaanLokasi,
  getDesaName,
  getKecamatanName,
} from '@pengawas/shared/wilayah-fields'

describe('wilayah-fields', () => {
  it('prefers API alias nama_kecamatan over n_kec', () => {
    expect(getKecamatanName({ nama_kecamatan: 'Cibeber', n_kec: 'CIBEBER' })).toBe('Cibeber')
  })

  it('falls back to n_kec', () => {
    expect(getKecamatanName({ n_kec: 'Cianjur' })).toBe('Cianjur')
  })

  it('prefers nama_desa then n_desa', () => {
    expect(getDesaName({ nama_desa: 'Mayak' })).toBe('Mayak')
    expect(getDesaName({ n_desa: 'Mayak' })).toBe('Mayak')
  })

  it('formats kec-desa by default (pengawas UI style)', () => {
    expect(
      formatLokasiWilayah({ nama_desa: 'Mayak' }, { nama_kecamatan: 'Cibeber' }),
    ).toBe('Cibeber · Mayak')
  })

  it('formats pekerjaan lokasi with empty fallback', () => {
    expect(
      formatPekerjaanLokasi(
        {
          desa: { nama_desa: 'Mayak' },
          kecamatan: { nama_kecamatan: 'Cibeber' },
        },
        { separator: ' • ' },
      ),
    ).toBe('Cibeber • Mayak')
  })

  it('marks konsultan without village location', () => {
    expect(formatPekerjaanLokasi({ is_konsultan: true }, { empty: '—' })).toBe('—')
  })
})
