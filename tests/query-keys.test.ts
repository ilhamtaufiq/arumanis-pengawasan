import { describe, expect, it } from 'bun:test'
import { queryKeys } from '@pengawas/shared/query-keys'

describe('queryKeys.pekerjaan', () => {
  it('normalizes detail key for number and string ids', () => {
    expect(queryKeys.pekerjaan.detail(421)).toEqual(queryKeys.pekerjaan.detail('421'))
  })

  it('normalizes penerima key for number and string ids', () => {
    expect(queryKeys.pekerjaan.penerima(421, { page: 1 })).toEqual(
      queryKeys.pekerjaan.penerima('421', { page: 1 }),
    )
  })
})