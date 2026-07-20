import { describe, expect, test } from 'bun:test'
import {
  getPengawasVisibleBerkasJuduls,
  isPengawasBerkasJudulEnabled,
  matchesPengawasSharedBerkasJudul,
} from '../src/lib/pengawas-berkas-settings'

describe('pengawas berkas settings', () => {
  test('defaults all shared titles to disabled', () => {
    expect(getPengawasVisibleBerkasJuduls(undefined)).toEqual([])
    expect(getPengawasVisibleBerkasJuduls([])).toEqual([])
    expect(isPengawasBerkasJudulEnabled(undefined, 'RAB')).toBe(false)
  })

  test('returns only enabled titles', () => {
    const settings = [
      { key: 'pengawas_berkas_show_rab', value: '1' },
      { key: 'pengawas_berkas_show_gambar', value: '0' },
      { key: 'pengawas_berkas_show_nego', value: '1' },
    ]
    expect(getPengawasVisibleBerkasJuduls(settings)).toEqual(['RAB', 'NEGO'])
  })

  test('matches jenis_dokumen case-insensitively and via aliases', () => {
    expect(matchesPengawasSharedBerkasJudul('RAB', ['RAB'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('Rab', ['RAB'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul(' rab ', ['RAB'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('RAB Final', ['RAB'])).toBe(true)

    expect(matchesPengawasSharedBerkasJudul('GAMBAR', ['GAMBAR'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('Gambar', ['GAMBAR'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('gbr', ['GAMBAR'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('GBR', ['GAMBAR'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('G.B.R', ['GAMBAR'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('gambar kerja', ['GAMBAR'])).toBe(true)

    expect(matchesPengawasSharedBerkasJudul('NEGO', ['NEGO'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('Nego', ['NEGO'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('Negosiasi', ['NEGO'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('Hasil Negosiasi', ['NEGO'])).toBe(true)

    expect(matchesPengawasSharedBerkasJudul('Kontrak', ['RAB', 'GAMBAR', 'NEGO'])).toBe(false)
    expect(matchesPengawasSharedBerkasJudul('SPK', ['RAB'])).toBe(false)
  })
})
