const base = process.env.API_BASE || 'http://apiamis.test/api'
const token = process.env.APIAMIS_TOKEN || ''

async function probe(label, path) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetch(`${base}${path}`, { headers })
    const json = await res.json().catch(() => null)
    const total = json?.meta?.total ?? null
    const n = Array.isArray(json?.data) ? json.data.length : null
    const sample = Array.isArray(json?.data)
      ? json.data.slice(0, 3).map((x) => x.nama_paket || x.id)
      : null
    console.log(JSON.stringify({ label, status: res.status, total, n, sample, path }, null, 0))
  } catch (e) {
    console.log(JSON.stringify({ label, error: String(e), path }))
  }
}

await probe('list', '/pekerjaan?per_page=5&page=1')
await probe('search-kubang', '/pekerjaan?per_page=5&page=1&search=kubang')
await probe('search-encoded', '/pekerjaan?per_page=5&page=1&search=' + encodeURIComponent('kubang'))
await probe('prod-list', '') // skip
