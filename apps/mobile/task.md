# Arumanis Pengawasan — Mobile App Progress

**Target stack:** Expo + React Native + Expo Router + NativeWind  
**Backend:** Langsung ke `apiamis` (Bearer token, tanpa BFF)  
**Terakhir diperbarui:** 2026-07-06

---

## Ringkasan Progress

| Fase | Status | PR | Catatan |
|------|--------|-----|---------|
| 0 — Fondasi Monorepo | ✅ Selesai | — | `packages/shared`, `packages/api-client`, folder mobile |
| 1 — Scaffold + Navigasi | ✅ Selesai | PR-2 | Expo Router, NativeWind, tab/stack, layar dasar |
| 2 — Auth Standalone | ✅ Selesai | PR-3 | Login email/password langsung APIAMIS + Bearer |
| 3 — Detail Pekerjaan | ✅ Selesai | PR-4–6 | Tab inti + antrean offline foto SQLite |
| 4 — Notifikasi & Presence | ✅ Selesai | PR-7 | Realtime, local push, presence heartbeat |
| 5 — Polish & Distribusi | ✅ Selesai | PR-8 | Error boundary, icon/splash, EAS, README |
| 6 — Paritas Web (opsional) | ⬜ Belum | — | Output, addendum, panduan, maps, OCR |

**Legenda:** ⬜ Belum · 🔄 Berjalan · ✅ Selesai · ⏸ Ditunda

**Auth:** Hanya login email/password. Tidak ada SSO / handoff.

---

## Fase 0 — Fondasi Monorepo ✅

- [x] Bun workspaces (`packages/*`, `apps/*`)
- [x] `packages/shared` — types, format, foto-status, query-keys
- [x] `packages/api-client` — `createApiClient`, semua endpoint API
- [x] Web re-export via `src/lib/*` (tidak break import existing)
- [x] Folder `apps/mobile` + `task.md` ini

---

## Fase 1 — Scaffold + Navigasi ✅

### Setup
- [x] Expo app di `apps/mobile` (manual scaffold, monorepo-aware)
- [x] Expo Router (file-based routing)
- [x] NativeWind v4 + token `DESAIN.md` (`theme/tokens.ts`)
- [x] Env: `EXPO_PUBLIC_APIAMIS_BASE_URL` (`.env.example`)
- [x] Dependensi: `@pengawas/shared`, `@pengawas/api-client`, `@tanstack/react-query`

### Navigasi
- [x] Tab: Dashboard, Pekerjaan, Tiket (Profil via header)
- [x] Stack: Login, Detail Pekerjaan, Notifikasi
- [x] Splash background `#fff7e6` + loading states

### Layar
- [x] Login (email/password langsung APIAMIS)
- [x] Dashboard (KPI cards + daftar perhatian)
- [x] Daftar Pekerjaan (filter, pagination)
- [x] Tiket (daftar read-only)
- [x] Profil + logout (header)
- [x] Detail pekerjaan (tab ringkasan/progress/penerima/foto/tiket)

### Komponen UI (Neobrutalism)
- [x] `NeoSurface`, `NeoButton`, `NeoBadge`, `NeoInput`
- [x] `MetricCard`, `SectionHeader`, `EmptyState`, `Spinner`

### Acceptance
- [x] Typecheck mobile green (`bun run mobile:typecheck`)
- [x] Expo Web bundle green
- [ ] Manual smoke: `bun run mobile` di emulator/device

---

## Fase 2 — Auth Standalone ✅

- [x] `POST {APIAMIS}/auth/login` → simpan `token` di SecureStore
- [x] `GET {APIAMIS}/auth/me` + `POST {APIAMIS}/auth/logout` via Bearer
- [x] Semua data API langsung ke `{APIAMIS}/*`
- [x] `createApiClient({ getAuthHeader: () => 'Bearer ...' })`
- [x] 401 → clear token + redirect login
- [ ] Test manual: login native device + smoke data pekerjaan

---

## Fase 3 — Detail Pekerjaan ✅

### PR-4: Ringkasan + Progress ✅
- [x] Tab ringkasan pekerjaan (hero + data kontrak + output)
- [x] Progress estimasi (fisik/keuangan, rencana/realisasi per tanggal)
- [x] Loading / empty / error states
- [x] Redesain layout detail (hero KPI, tab ikon)

### PR-5: Foto ✅
- [x] Matriks slot 0% / 25% / 50% / 75% / 100%
- [x] `expo-image-picker` kamera + galeri + upload ke APIAMIS
- [x] Hapus / ganti foto + preview modal
- [x] EXIF GPS via `exifr` (lite) + fallback `expo-location`
- [x] Koordinat wajib + validasi
- [x] Retry upload + antrean offline SQLite (`expo-sqlite`) + auto-retry saat online

### PR-6: Penerima + Tiket ✅
- [x] CRUD penerima manfaat (komunal / individu)
- [x] Form tambah tiket + daftar tiket pekerjaan
- [x] Paginasi tab Penerima & Foto

### Ditunda (bukan MVP)
- [ ] Tab Output matrix kompleks
- [ ] Kontrak Addendum
- [ ] Progress Estimasi chart
- [ ] Live Chat widget
- [ ] Cetak foto HTML

---

## Fase 4 — Notifikasi & Presence ✅

- [x] Polling notifikasi (fallback jika Reverb off)
- [x] Realtime via Laravel Reverb (`useNotificationRealtime`)
- [x] Halaman daftar notifikasi + panel header
- [x] Mark read / mark all read
- [x] Presence heartbeat (`POST /presence/heartbeat`, app `pengawasan`)
- [x] Local push saat app background (`expo-notifications` + broadcast Reverb)
- [x] Tap notifikasi → navigasi internal (`useNotificationNavigation`)
- [x] Pelacakan GPS latar belakang (opt-in di Profil, `expo-task-manager` + heartbeat + koordinat)

> Push server-side (FCM/APNs token ke backend) belum ada endpoint `apiamis` — ditunda.

---

## Fase 5 — Polish & Distribusi ✅

- [x] Error boundary per layar + retry (`ScreenErrorFallback`, Expo Router `ErrorBoundary`)
- [x] Build APK lokal VPS (`scripts/build-android.sh`, git sync otomatis)
- [x] EAS Build profiles (`apps/mobile/eas.json`: development, preview, production)
- [x] App icon + splash (`assets/arumanis.png`, `expo-splash-screen` hide setelah auth)
- [x] Dokumentasi setup developer (README § Aplikasi Mobile)
- [ ] Manual smoke: emulator/device + APK production

---

## Fase 6 — Paritas Web (Opsional)

- [ ] Tab Output
- [ ] Kontrak Addendum
- [ ] Buat Laporan mingguan
- [ ] Panduan (markdown renderer)
- [ ] Peta koordinat (`react-native-maps`)
- [ ] OCR watermark (native / defer)

---

## Mapping Dependensi Web → Mobile

| Web | Mobile | Status |
|-----|--------|--------|
| `react-router-dom` | Expo Router | ✅ |
| Tailwind CSS | NativeWind | ✅ |
| `lucide-react` | `lucide-react-native` | ✅ |
| Dropzone | `expo-image-picker` | ✅ |
| IndexedDB | `expo-sqlite` + `expo-file-system` | ✅ |
| httpOnly cookie | SecureStore + Bearer | ✅ |
| Leaflet | `react-native-maps` | ⬜ |
| Tesseract.js | Defer | ⬜ |
| Laravel Echo | Reverb + polling fallback | ✅ |

---

## Verifikasi Rutin

```powershell
rtk bun run typecheck
rtk bun test
rtk bun run mobile:typecheck
rtk bun run mobile:web
```