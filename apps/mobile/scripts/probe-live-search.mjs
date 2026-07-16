/**
 * One-off live API probe. Pass credentials via env — do not commit secrets.
 *
 *   LIVE_EMAIL=... LIVE_PASSWORD=... bun apps/mobile/scripts/probe-live-search.mjs
 */
const base = (process.env.API_BASE || 'https://apiamis.cianjur.space/api').replace(/\/$/, '')
const email = process.env.LIVE_EMAIL || ''
const password = process.env.LIVE_PASSWORD || ''

if (!email || !password) {
  console.error('Set LIVE_EMAIL and LIVE_PASSWORD')
  process.exit(1)
}

async function json(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

const login = await json('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
})

if (login.status >= 400) {
  console.log(JSON.stringify({ step: 'login', status: login.status, body: login.body }, null, 2))
  process.exit(1)
}

const token =
  login.body?.token ||
  login.body?.data?.token ||
  (typeof login.body?.data === 'object' ? login.body?.data?.access_token : null)

if (!token) {
  console.log(JSON.stringify({ step: 'login_no_token', body: login.body }, null, 2))
  process.exit(1)
}

const auth = { Authorization: `Bearer ${token}` }

async function list(label, query) {
  const { status, body } = await json(`/pekerjaan?${query}`, { headers: auth })
  const data = Array.isArray(body?.data) ? body.data : []
  return {
    label,
    status,
    total: body?.meta?.total ?? null,
    per_page: body?.meta?.per_page ?? null,
    page: body?.meta?.current_page ?? null,
    last_page: body?.meta?.last_page ?? null,
    count: data.length,
    sample: data.slice(0, 5).map((p) => ({
      id: p.id,
      nama_paket: p.nama_paket,
      desa: p.desa?.nama_desa ?? null,
      kecamatan: p.kecamatan?.nama_kecamatan ?? null,
    })),
  }
}

const bare = await list('no_search', 'per_page=5&page=1&sort_by=created_at&sort_direction=desc')
const kubang = await list(
  'search_kubang',
  'per_page=5&page=1&search=kubang&sort_by=created_at&sort_direction=desc',
)
const air = await list(
  'search_air',
  'per_page=5&page=1&search=air&sort_by=created_at&sort_direction=desc',
)

const summary = {
  base,
  login: 'ok',
  bare,
  kubang,
  air,
  conclusion: {
    search_kubang_reduces_total:
      bare.total != null && kubang.total != null ? kubang.total < bare.total : null,
    search_air_reduces_total:
      bare.total != null && air.total != null ? air.total < bare.total : null,
    api_ignores_search:
      bare.total != null &&
      kubang.total != null &&
      bare.total === kubang.total &&
      bare.sample?.[0]?.id === kubang.sample?.[0]?.id,
  },
}

console.log(JSON.stringify(summary, null, 2))
