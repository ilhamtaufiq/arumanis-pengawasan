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

  test('matches jenis_dokumen case-insensitively', () => {
    expect(matchesPengawasSharedBerkasJudul('RAB', ['RAB'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul(' rab ', ['RAB'])).toBe(true)
    expect(matchesPengawasSharedBerkasJudul('RAB Final', ['RAB'])).toBe(false)
    expect(matchesPengawasSharedBerkasJudul('Kontrak', ['RAB', 'GAMBAR', 'NEGO'])).toBe(false)
  })
})
