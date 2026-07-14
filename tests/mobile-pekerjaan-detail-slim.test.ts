import { describe, expect, test } from 'bun:test'
import {
  DETAIL_FOTO_URL_SOFT_LIMIT,
  slimPekerjaanDetailForUi,
} from '../apps/mobile/lib/pekerjaan-detail-slim'
import type { Foto, PekerjaanDetail } from '@pengawas/shared'

function makeDetail(fotoCount: number): PekerjaanDetail {
  const foto: Foto[] = Array.from({ length: fotoCount }, (_, i) => ({
    id: i + 1,
    komponen_id: 1,
    keterangan: '0%',
    foto_url: `https://cdn.example.com/full/${i}.jpg`,
    foto_thumb_url: `https://cdn.example.com/thumb/${i}.jpg`,
  }))

  return {
    id: 99,
    nama_paket: 'Paket Uji',
    foto,
    output: [],
    penerima: [],
    assignment_sources: ['manual'],
  }
}

describe('slimPekerjaanDetailForUi', () => {
  test('keeps urls when under soft limit', () => {
    const slim = slimPekerjaanDetailForUi(makeDetail(5))
    expect(slim.foto?.[0]?.foto_url).toContain('full')
  })

  test('strips urls when over soft limit to avoid OOM', () => {
    const slim = slimPekerjaanDetailForUi(makeDetail(DETAIL_FOTO_URL_SOFT_LIMIT + 5))
    expect(slim.foto?.length).toBe(DETAIL_FOTO_URL_SOFT_LIMIT + 5)
    expect(slim.foto?.[0]?.foto_url).toBeNull()
    // Thumb boleh tetap (lebih ringan dari full); full URL yang dibuang
    expect(slim.foto?.[0]?.foto_thumb_url).toContain('thumb')
    expect(slim.foto?.[0]?.keterangan).toBe('0%')
    expect(slim.foto_count).toBe(DETAIL_FOTO_URL_SOFT_LIMIT + 5)
  })
})
