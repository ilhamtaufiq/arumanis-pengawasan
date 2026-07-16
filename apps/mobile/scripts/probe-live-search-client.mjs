/**
 * Probe using the same URL-building logic as the mobile client.
 * LIVE_EMAIL / LIVE_PASSWORD required. Do not commit secrets.
 */
import { createApiClient } from '../../../packages/api-client/src/create-client.ts'

const base = (process.env.API_BASE || 'https://apiamis.cianjur.space/api').replace(/\/$/, '')
const email = process.env.LIVE_EMAIL || ''
const password = process.env.LIVE_PASSWORD || ''

if (!email || !password) {
  console.error('Set LIVE_EMAIL and LIVE_PASSWORD')
  process.exit(1)
}

const loginRes = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const loginBody = await loginRes.json()
const token = loginBody?.token || loginBody?.data?.token
if (!token) {
  console.log(JSON.stringify({ login: 'fail', status: loginRes.status, loginBody }, null, 2))
  process.exit(1)
}

let lastUrl = ''
const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  lastUrl = String(input)
  return originalFetch(input, init)
}

const client = createApiClient({
  apiPrefix: base,
  bffPrefix: base,
  credentials: 'omit',
  getAuthHeader: () => `Bearer ${token}`,
})

function buildParams(input) {
  const params = {
    page: input.page ?? 1,
    per_page: input.perPage ?? 5,
    sort_by: 'created_at',
    sort_direction: 'desc',
  }
  if (input.search?.trim()) params.search = input.search.trim()
  if (input.tahun?.trim()) params.tahun = input.tahun.trim()
  return params
}

const bare = await client.getPekerjaanList(buildParams({ page: 1, perPage: 5 }))
const bareUrl = lastUrl
const kubang = await client.getPekerjaanList(
  buildParams({ page: 1, perPage: 5, search: 'kubang' }),
)
const kubangUrl = lastUrl

console.log(
  JSON.stringify(
    {
      bare: {
        url: bareUrl,
        total: bare.meta?.total,
        count: bare.data?.length,
        first: bare.data?.[0]?.nama_paket,
      },
      kubang: {
        url: kubangUrl,
        total: kubang.meta?.total,
        count: kubang.data?.length,
        first: kubang.data?.[0]?.nama_paket,
        sample: kubang.data?.slice(0, 3).map((p) => p.nama_paket),
      },
      works: Number(kubang.meta?.total) < Number(bare.meta?.total),
      url_has_search: kubangUrl.includes('search=kubang'),
    },
    null,
    2,
  ),
)

globalThis.fetch = originalFetch
