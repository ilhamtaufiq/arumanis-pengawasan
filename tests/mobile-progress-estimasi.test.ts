import { describe, expect, test } from 'bun:test'
import {
  createEmptyProgressEstimasiResponse,
  emptyHistories,
  historiesFromResponse,
} from '../apps/mobile/lib/progress-estimasi'

describe('progress-estimasi', () => {
  test('emptyHistories returns zeroed sections', () => {
    const histories = emptyHistories()
    expect(histories.fisik.rencana).toEqual([])
    expect(histories.keuangan.realisasi).toEqual([])
  })

  test('historiesFromResponse tolerates missing sections', () => {
    const histories = historiesFromResponse({})
    expect(histories.fisik.rencana).toEqual([])
    expect(histories.keuangan.rencana).toEqual([])
  })

  test('createEmptyProgressEstimasiResponse is valid placeholder', () => {
    const response = createEmptyProgressEstimasiResponse(12, 2026)
    expect(response.data.pekerjaan_id).toBe(12)
    expect(response.data.fisik.rencana).toEqual([])
    expect(response.puspen_progress_fisik).toEqual([])
    expect(historiesFromResponse(response.data).fisik.rencana).toEqual([])
  })
})