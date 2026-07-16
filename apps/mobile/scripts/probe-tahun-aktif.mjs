const base = (process.env.API_BASE || 'https://apiamis.cianjur.space/api').replace(/\/$/, '')
const email = process.env.LIVE_EMAIL || ''
const password = process.env.LIVE_PASSWORD || ''

const login = await (
  await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
).json()
const token = login.token || login.data?.token
if (!token) {
  console.log(JSON.stringify({ login: 'fail', login }, null, 2))
  process.exit(1)
}

const h = { Accept: 'application/json', Authorization: `Bearer ${token}` }
const settingsRes = await fetch(`${base}/app-settings`, { headers: h })
const settingsBody = await settingsRes.json()
const items = Array.isArray(settingsBody?.data)
  ? settingsBody.data
  : Array.isArray(settingsBody)
    ? settingsBody
    : []
const map = {}
for (const s of items) {
  if (s?.key) map[s.key] = s.value
}

const tahun = map.tahun_anggaran || ''
const listNoYear = await (
  await fetch(`${base}/pekerjaan?per_page=1&page=1`, { headers: h })
).json()
const listYear = tahun
  ? await (
      await fetch(`${base}/pekerjaan?per_page=1&page=1&tahun=${encodeURIComponent(tahun)}`, {
        headers: h,
      })
    ).json()
  : null

console.log(
  JSON.stringify(
    {
      tahun_anggaran: tahun || null,
      total_all: listNoYear?.meta?.total ?? null,
      total_active_year: listYear?.meta?.total ?? null,
      sample_keys: Object.keys(map).filter((k) => /tahun|app_name|landing/i.test(k)),
    },
    null,
    2,
  ),
)
