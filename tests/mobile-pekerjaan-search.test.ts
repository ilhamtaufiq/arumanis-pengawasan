import { describe, expect, test } from 'bun:test'
import {
  buildPekerjaanListParams,
  resolveListPageForFilter,
} from '../apps/mobile/lib/pekerjaan-list-params'
import {
  matchPekerjaanKeyword,
  matchPekerjaanTahun,
  normalizeSearchText,
  serverSearchLikelyIgnored,
} from '../apps/mobile/lib/pekerjaan-search-match'
import { createApiClient } from '../packages/api-client/src/create-client'
import type { Pekerjaan } from '@pengawas/shared'

describe('buildPekerjaanListParams', () => {
  test('includes search when non-empty', () => {
    const p = buildPekerjaanListParams({
      search: '  air minum  ',
      page: 2,
      perPage: 8,
      tahun: '2026',
    })
    expect(p.search).toBe('air minum')
    expect(p.page).toBe(2)
    expect(p.per_page).toBe(8)
    expect(p.tahun).toBe('2026')
  })

  test('omits empty search and tahun', () => {
    const p = buildPekerjaanListParams({ search: '   ', tahun: '', page: 1 })
    expect(p.search).toBeUndefined()
    expect(p.tahun).toBeUndefined()
  })
})

describe('resolveListPageForFilter', () => {
  test('forces page 1 when search filter changes', () => {
    const r = resolveListPageForFilter({
      page: 4,
      filterKey: 'air|',
      prevFilterKey: '|',
    })
    expect(r.filterChanged).toBe(true)
    expect(r.pageForQuery).toBe(1)
  })

  test('keeps page when filter unchanged', () => {
    const r = resolveListPageForFilter({
      page: 3,
      filterKey: 'air|2026',
      prevFilterKey: 'air|2026',
    })
    expect(r.filterChanged).toBe(false)
    expect(r.pageForQuery).toBe(3)
  })
})

describe('catalog-style match (full object scan)', () => {
  const sample: Pekerjaan = {
    id: 1,
    nama_paket: 'Pembangunan SPAM Desa X',
    desa: { id: 1, nama_desa: 'Kubang' },
    kecamatan: { id: 2, nama_kecamatan: 'Ciranjang' },
    kegiatan: { id: 3, tahun_anggaran: 2026 },
  }

  test('finds kubang in nested desa even if not in nama_paket', () => {
    expect(matchPekerjaanKeyword(sample, 'kubang')).toBe(true)
    expect(matchPekerjaanKeyword(sample, 'KUBANG')).toBe(true)
    expect(matchPekerjaanKeyword(sample, 'ciranjang spam')).toBe(true)
    expect(matchPekerjaanKeyword(sample, 'zzzz')).toBe(false)
  })

  test('tahun filter', () => {
    expect(matchPekerjaanTahun(sample, '2026')).toBe(true)
    expect(matchPekerjaanTahun(sample, '2025')).toBe(false)
  })

  test('normalize collapses noise', () => {
    expect(normalizeSearchText('  KuBang  ')).toBe('kubang')
  })

  test('serverSearchLikelyIgnored', () => {
    expect(
      serverSearchLikelyIgnored('kubang', {
        data: [{ id: 1, nama_paket: 'Jasa Konsultan' }],
        meta: { total: 558 },
      }),
    ).toBe(true)

    expect(
      serverSearchLikelyIgnored('kubang', {
        data: [sample],
        meta: { total: 2 },
      }),
    ).toBe(false)
  })
})

describe('getPekerjaanList query string', () => {
  test('forwards search param on request URL', async () => {
    let requestedUrl = ''
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input)
      return new Response(
        JSON.stringify({
          data: [{ id: 1, nama_paket: 'Paket Air' }],
          meta: { current_page: 1, last_page: 1, per_page: 5, total: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const client = createApiClient({
        apiPrefix: 'https://example.test/api',
        bffPrefix: 'https://example.test/api',
        credentials: 'omit',
      })
      await client.getPekerjaanList(
        buildPekerjaanListParams({ search: 'air', page: 1, perPage: 5 }),
      )
      expect(requestedUrl).toContain('search=air')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
