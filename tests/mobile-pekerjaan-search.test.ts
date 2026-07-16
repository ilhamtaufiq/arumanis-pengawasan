import { describe, expect, test } from 'bun:test'
import {
  buildPekerjaanListParams,
  buildPekerjaanListQueryString,
} from '../apps/mobile/lib/pekerjaan-list-params'
import { matchPekerjaanKeyword } from '../apps/mobile/lib/pekerjaan-search-match'
import { createApiClient } from '../packages/api-client/src/create-client'
import type { Pekerjaan } from '@pengawas/shared'

describe('API search param contract', () => {
  test('builds search=kubang for server', () => {
    const qs = buildPekerjaanListQueryString({
      search: 'kubang',
      page: 1,
      perPage: 12,
    })
    expect(qs).toContain('search=kubang')
    expect(qs).toContain('page=1')
    expect(qs).toContain('per_page=12')
  })

  test('getPekerjaanList includes search in URL', async () => {
    let requestedUrl = ''
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input)
      // Simulasi production yang IGNORE search (total tetap 558)
      return new Response(
        JSON.stringify({
          data: Array.from({ length: 20 }, (_, i) => ({
            id: 700 - i,
            nama_paket: `Jasa Konsultan Paket ${i}`,
          })),
          meta: { current_page: 1, last_page: 28, per_page: 20, total: 558 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const client = createApiClient({
        apiPrefix: 'https://apiamis.example/api',
        bffPrefix: 'https://apiamis.example/api',
        credentials: 'omit',
      })
      const res = await client.getPekerjaanList(
        buildPekerjaanListParams({ search: 'kubang', page: 1, perPage: 12 }),
      )
      expect(requestedUrl).toContain('search=kubang')
      // Production-like: total masih 558 meski search dikirim
      expect(res.meta?.total).toBe(558)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('client match for catalog fallback', () => {
  test('matches desa Kubang when nama_paket does not contain it', () => {
    const item: Pekerjaan = {
      id: 1,
      nama_paket: 'Pembangunan MCK Individu',
      desa: { id: 9, nama_desa: 'Kubang' },
      kecamatan: { id: 1, nama_kecamatan: 'Sukaluyu' },
    }
    expect(matchPekerjaanKeyword(item, 'kubang')).toBe(true)
    expect(matchPekerjaanKeyword(item, 'konsultan')).toBe(false)
  })
})
