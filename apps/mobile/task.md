# Arumanis Pengawasan — Mobile App Progress

**Target stack:** Expo + React Native + Expo Router + NativeWind  
**Backend:** BFF `pengawas` → `apiamis` (tanpa ubah backend)  
**Terakhir diperbarui:** 2026-07-06

---

## Ringkasan Progress

| Fase | Status | PR | Catatan |
|------|--------|-----|---------|
| 0 — Fondasi Monorepo | ✅ Selesai | — | `packages/shared`, `packages/api-client`, folder mobile |
| 1 — Scaffold + Navigasi | ✅ Selesai | PR-2 | Expo Router, NativeWind, tab/stack, layar dasar |
| 2 — Auth Standalone | 🔄 Sebagian | PR-3 | Langsung APIAMIS + Bearer; SSO handoff belum |
| 3 — Detail Pekerjaan | 🔄 Sebagian | PR-4–6 | Tab inti selesai; antrean offline foto belum |
| 4 — Notifikasi & Presence | ⬜ Belum | PR-7 | Polling notifikasi, heartbeat |
| 5 — Polish & Distribusi | ⬜ Belum | PR-8 | EAS Build, deep link SSO, app icon |
| 6 — Paritas Web (opsional) | ⬜ Belum | — | Output, addendum, panduan, maps, OCR |

**Legenda:** ⬜ Belum · 🔄 Berjalan · ✅ Selesai · ⏸ Ditunda

---

## Fase 0 — Fondasi Monorepo ✅

- [x] Bun workspaces (`packages/*`, `apps/*`)
- [x] `packages/shared` — types, format, foto-status, query-keys
- [x] `packages/api-client` — `createApiClient`, semua endpoint API
- [x] Web re-export via `src/lib/*` (tidak break import existing)
- [x] Folder `apps/mobile` + `task.md` ini
- [x] Verifikasi: `bun run typecheck` + `bun test` green (39 pass)

---

## Fase 1 — Scaffold + Navigasi ✅

### Setup
- [x] Expo app di `apps/mobile` (manual scaffold, monorepo-aware)
- [x] Expo Router (file-based routing)
- [x] NativeWind v4 + token `DESAIN.md` (`theme/tokens.ts`)
- [x] Env: `EXPO_PUBLIC_APIAMIS_BASE_URL` (`.env.example`)
- [x] Dependensi: `@pengawas/shared`, `@pengawas/api-client`, `@tanstack/react-query`

### Navigasi
- [x] Tab: Dashboard, Pekerjaan, Tiket, Profil
- [x] Stack: Login, Detail Pekerjaan, Notifikasi
- [x] Splash background `#fff7e6` + loading states

### Layar
- [x] Login (email/password dev via `/bff/auth/mobile/login`)
- [x] Dashboard (KPI cards + daftar perhatian)
- [x] Daftar Pekerjaan (filter, pagination)
- [x] Tiket (daftar read-only)
- [x] Profil + logout
- [x] Detail pekerjaan (tab ringkasan/progress/penerima/foto/tiket)

### Komponen UI (Neobrutalism)
- [x] `NeoSurface`, `NeoButton`, `NeoBadge`, `NeoInput`
- [x] `MetricCard`, `SectionHeader`, `EmptyState`, `Spinner`

### Acceptance
- [x] Typecheck mobile green (`bun run mobile:typecheck`)
- [x] Expo Web bundle green (`expo export --platform web`)
- [ ] Manual smoke: `bun run mobile` di emulator/device

### Menjalankan
```powershell
# Terminal 1 — BFF (port 3001 jika dev server terpisah, atau 3000)
bun run dev

# Terminal 2 — Mobile (standalone ke APIAMIS, tidak perlu BFF)
# Set EXPO_PUBLIC_APIAMIS_BASE_URL di apps/mobile/.env
bun run mobile
```

---

## Fase 2 — Auth Standalone (sebagian selesai)

Alur sama dengan upstream `www/bun` (`handleLogin` → APIAMIS), tapi tanpa BFF pengawas:

- [x] `POST {APIAMIS}/auth/login` → simpan `token` di SecureStore
- [x] `GET {APIAMIS}/auth/me` + `POST {APIAMIS}/auth/logout` via Bearer
- [x] Semua data API langsung ke `{APIAMIS}/*` (bukan `/bff/api`)
- [x] `createApiClient({ getAuthHeader: () => 'Bearer ...' })`
- [x] 401 → clear token + redirect login
- [ ] SSO / handoff: `POST {APIAMIS}/auth/handoff/exchange` + deep link
- [ ] Test manual: login native device + smoke data pekerjaan

> Web dashboard tetap pakai BFF + cookie. Mobile berdiri sendiri.

---

## Fase 3 — Detail Pekerjaan (sebagian selesai)

### PR-4: Ringkasan + Progress ✅
- [x] Tab ringkasan pekerjaan (KPI, output, metadata)
- [x] Progress estimasi (fisik/keuangan, rencana/realisasi per tanggal — sama web)
- [x] Loading / empty / error states

### PR-5: Foto (sebagian)
- [x] Matriks slot 0% / 25% / 50% / 75% / 100%
- [x] `expo-image-picker` kamera langsung + upload ke APIAMIS
- [x] Hapus foto (konfirmasi)
- [ ] EXIF GPS via `exifr`
- [ ] Fallback GPS: `expo-location`
- [ ] Antrean offline SQLite + auto-retry

### PR-6: Penerima + Tiket ✅
- [x] CRUD penerima manfaat (komunal / individu)
- [x] Form tambah tiket + daftar tiket pekerjaan

### Ditunda (bukan MVP)
- [ ] Tab Output matrix kompleks
- [ ] Kontrak Addendum
- [ ] Progress Estimasi chart
- [ ] Live Chat widget
- [ ] Cetak foto HTML

---

## Fase 4 — Notifikasi & Presence

- [ ] Polling notifikasi (interval ~20s)
- [ ] Halaman daftar notifikasi
- [ ] Mark read / mark all read
- [ ] Presence heartbeat
- [ ] Push notification (butuh endpoint backend — fase lanjut)

---

## Fase 5 — Polish & Distribusi

- [ ] Error boundary per screen + retry button
- [ ] Deep link SSO (`pengawas://auth?code=...`)
- [ ] EAS Build profiles (development, preview, production)
- [ ] App icon + splash screen
- [ ] Dokumentasi setup developer (README section Mobile)

---

## Fase 6 — Paritas Web (Opsional)

- [ ] Tab Output
- [ ] Kontrak Addendum
- [ ] Buat Laporan mingguan
- [ ] Panduan (markdown renderer)
- [ ] Peta koordinat (`react-native-maps`)
- [ ] OCR watermark (native / defer)
- [ ] Laravel Echo realtime

---

## Mapping Dependensi Web → Mobile

| Web | Mobile | Status |
|-----|--------|--------|
| `react-router-dom` | Expo Router | ⬜ |
| Tailwind CSS | NativeWind | ⬜ |
| `lucide-react` | `lucide-react-native` | ⬜ |
| Dropzone | `expo-image-picker` | ⬜ |
| IndexedDB | `expo-sqlite` | ⬜ |
| httpOnly cookie | SecureStore + Bearer | ⬜ |
| Leaflet | `react-native-maps` | ⬜ |
| Tesseract.js | Defer | ⬜ |
| Laravel Echo | Polling | ⬜ |

---

## Shared Packages (sudah tersedia)

| Package | Isi | Dipakai mobile |
|---------|-----|----------------|
| `@pengawas/shared` | types, format, foto-status, query-keys | ✅ Siap |
| `@pengawas/api-client` | `createApiClient`, semua endpoint | ✅ Siap (butuh config Bearer di Fase 2) |

---

## Catatan & Blocker

| Tanggal | Catatan |
|---------|---------|
| 2026-07-06 | Fase 0 selesai — monorepo + shared packages |
| 2026-07-06 | Fase 1 selesai — Expo scaffold + layar dasar + Neo UI |
| 2026-07-06 | BFF mobile auth dasar (Bearer, mobile/login, CORS) |
| 2026-07-06 | Fix Babel: pin `nativewind@4.1.23` (hindari `react-native-worklets` dari 4.2.x) |
| 2026-07-06 | Auth standalone: langsung APIAMIS, alur sama www/bun upstream |
| 2026-07-06 | Fase 3: tab detail pekerjaan (ringkasan, progress, penerima, foto, tiket) |
| | Blocker Fase 5: SSO deep link perlu koordinasi dengan portal Arumanis |

---

## Verifikasi Rutin

```powershell
# Root (web + packages)
rtk bun run typecheck
rtk bun test

# Mobile (setelah Fase 1)
rtk bun run mobile:web

# BFF terpisah (apiamis.test)
rtk bun run dev:server
```