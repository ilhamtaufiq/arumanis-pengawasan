/**
 * Smoke: verify getPekerjaanList sends `search` and response shape is paginated.
 * With token (optional): EXPO_PUBLIC_APIAMIS_BASE_URL + APIAMIS_TOKEN
 */
const base =
  process.env.EXPO_PUBLIC_APIAMIS_BASE_URL?.replace(/\/$/, '') ||
  'https://apiamis.cianjur.space/api'
const token = process.env.APIAMIS_TOKEN || process.env.TOKEN || ''

async function hit(path) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, { headers })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text: text.slice(0, 200) }
}

function countData(json) {
  if (!json || typeof json !== 'object') return null
  if (Array.isArray(json.data)) return json.data.length
  return null
}

function totalMeta(json) {
  if (!json || typeof json !== 'object') return null
  const t = json.meta?.total
  return t != null ? Number(t) : null
}

const list = await hit('/pekerjaan?per_page=5&page=1')
const search = await hit('/pekerjaan?per_page=5&page=1&search=air')
const emptyish = await hit('/pekerjaan?per_page=5&page=1&search=zzzznonexist999')

console.log(
  JSON.stringify(
    {
      base,
      authed: Boolean(token),
      list: { status: list.status, rows: countData(list.json), total: totalMeta(list.json) },
      searchAir: {
        status: search.status,
        rows: countData(search.json),
        total: totalMeta(search.json),
      },
      searchEmpty: {
        status: emptyish.status,
        rows: countData(emptyish.json),
        total: totalMeta(emptyish.json),
      },
      searchReduces:
        list.status === 200 &&
        search.status === 200 &&
        totalMeta(list.json) != null &&
        totalMeta(search.json) != null
          ? totalMeta(search.json) <= totalMeta(list.json)
          : null,
      note:
        list.status === 401
          ? 'API butuh token (set APIAMIS_TOKEN). Client param search= tetap dicek di unit test.'
          : 'OK',
    },
    null,
    2,
  ),
)
