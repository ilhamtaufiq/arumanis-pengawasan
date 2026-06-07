# Rencana Implementasi Dashboard Khusus Pengawas

Tanggal: 2026-06-06

## Tujuan

Membangun aplikasi dashboard khusus pengawas di `C:\laragon\www\pengawas` dengan stack full stack berbasis Bun. Aplikasi ini menjadi portal terpisah yang mengambil data dari backend Laravel `apiamis`, terutama data pekerjaan, pengawas, progress, penerima, foto, tiket, dan statistik pengawasan.

Backend utama tetap `apiamis`. Aplikasi `pengawas` berperan sebagai frontend dashboard dan Bun backend-for-frontend (BFF) ringan untuk autentikasi, proxy API, normalisasi response, caching singkat, dan isolasi konfigurasi.

## Konteks Backend `apiamis`

Endpoint yang sudah tersedia dari `C:\laragon\www\apiamis\routes\api.php`:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/analytics`
- `GET /api/pekerjaan`
- `GET /api/pekerjaan/{pekerjaan}`
- `GET /api/progress/pekerjaan/{pekerjaanId}`
- `POST /api/progress/pekerjaan/{pekerjaanId}`
- `POST /api/foto`
- `POST /api/penerima`
- `GET /api/tiket`
- `POST /api/tiket/bulk-update`
- `POST /api/tiket/{tiket}/comments`
- `GET /api/pengawas/statistics`
- `GET /api/pengawas`
- `POST /api/pengawas`
- `GET /api/pengawas/{id}`
- `PUT/PATCH /api/pengawas/{id}`
- `DELETE /api/pengawas/{id}`

Catatan dari backend:

- Autentikasi memakai Laravel Sanctum bearer token.
- `Pekerjaan::scopeByUserRole()` sudah membatasi data non-admin berdasarkan `user_pekerjaan`, `kegiatan_role`, atau kecocokan `users.nip` dengan `pengawas.nip` / `pendamping.nip`.
- `PengawasController::statistics()` saat ini hanya mengembalikan `total_pengawas`, `total_lokasi`, dan `total_pagu`.
- `PengawasResource` menghitung `jumlah_lokasi` dan `total_pagu` dari pekerjaan sebagai pengawas utama.

## Stack Target

- Runtime/package manager/test runner: Bun.
- Frontend: React + TypeScript.
- Routing: TanStack Router atau React Router. Rekomendasi awal: TanStack Router untuk route typed dan struktur dashboard yang tumbuh bertahap.
- Server state: TanStack Query untuk caching, retry, invalidation, dan loading/error state API.
- UI: Tailwind CSS + shadcn/ui atau komponen lokal yang setara.
- Chart: Recharts untuk grafik dashboard operasional.
- Form: React Hook Form + Zod untuk validasi input.
- BFF/API lokal: Hono di atas Bun, atau `Bun.serve` langsung bila kebutuhan proxy tetap kecil.
- Test: `bun test` untuk unit test util/API client, Playwright untuk smoke test UI, dan typecheck TypeScript.

Dasar teknis:

- Bun menyediakan runtime, package manager, script runner, test runner, bundler, dan server HTTP dalam satu toolchain.
- Bun fullstack dev server dapat melayani asset frontend dan route API dari server Bun.
- Hono berbasis Web Standards dan dapat berjalan di Bun.
- TanStack Router mendukung React dengan integrasi Vite dan file-based routing.

Referensi resmi:

- https://bun.com/docs
- https://bun.com/docs/bundler/fullstack
- https://hono.dev/docs/concepts/web-standard
- https://tanstack.com/router/router/docs

## Arsitektur

```text
Browser Pengawas
  |
  | HTTP
  v
Bun app `pengawas`
  |
  | routes UI, static assets, local API `/bff/*`
  v
BFF Bun/Hono
  |
  | Bearer token / proxy / normalized JSON
  v
Laravel API `apiamis`
  |
  v
Database existing
```

Prinsip:

- Jangan duplikasi business logic yang sudah ada di `apiamis`.
- BFF hanya menangani concern frontend: token handling, response normalization, defensive timeout, caching singkat, dan komposisi data.
- Hak akses tetap menjadi tanggung jawab backend `apiamis`.
- Dashboard pengawas harus tetap berguna walau endpoint agregasi khusus belum ada, dengan fallback ke endpoint `pekerjaan`, `pengawas/statistics`, dan progress per pekerjaan.

## Struktur Folder Usulan

```text
pengawas/
  AGENTS.md
  IMPLEMENTATION_PLAN.md
  package.json
  bun.lock
  tsconfig.json
  vite.config.ts
  src/
    app/
      main.tsx
      routeTree.gen.ts
      routes/
        __root.tsx
        login.tsx
        index.tsx
        pekerjaan/
          index.tsx
          $pekerjaanId.tsx
        tiket.tsx
        profile.tsx
    components/
      layout/
      dashboard/
      pekerjaan/
      shared/
    lib/
      api/
        apiamis-client.ts
        auth.ts
        endpoints.ts
        schemas.ts
      format/
      query/
    server/
      index.ts
      bff/
        auth.ts
        proxy.ts
        pengawas.ts
    styles/
      globals.css
    tests/
  public/
  docs/
```

## Environment

Backend URL:

- Local/development: `http://apiamis.test/api`
- Deployment/server: `https://apiamis.cianjur.space/api`

Contoh `.env.development`:

```env
BUN_ENV=development
APP_URL=http://localhost:3000
APIAMIS_BASE_URL=http://apiamis.test/api
API_TIMEOUT_MS=15000
SESSION_COOKIE_NAME=pengawas_session
SESSION_COOKIE_SECURE=false
```

Contoh `.env.production`:

```env
BUN_ENV=production
APP_URL=https://pengawas.cianjur.space
APIAMIS_BASE_URL=https://apiamis.cianjur.space/api
API_TIMEOUT_MS=15000
SESSION_COOKIE_NAME=pengawas_session
SESSION_COOKIE_SECURE=true
```

Produksi/deployment:

- `SESSION_COOKIE_SECURE=true`
- Gunakan HTTPS.
- Jangan hardcode `apiamis.test` atau `apiamis.cianjur.space` di source code; selalu baca dari `APIAMIS_BASE_URL`.
- Set CORS di `apiamis` hanya untuk domain dashboard bila dashboard memanggil API langsung.
- Bila lewat BFF, browser hanya bicara ke domain dashboard dan BFF yang bicara ke `apiamis`.

## Modul Fitur

### 1. Autentikasi

Fitur:

- Login email/password ke `POST /api/auth/login`.
- Simpan token di httpOnly cookie melalui BFF, bukan di `localStorage`.
- Load user dari `GET /api/auth/me`.
- Logout ke `POST /api/auth/logout`, lalu hapus cookie lokal.

Acceptance criteria:

- User tanpa sesi diarahkan ke `/login`.
- User terautentikasi diarahkan ke `/`.
- Semua request API membawa token.
- Error 401 membersihkan sesi lokal.

### 2. Dashboard Ringkasan Pekerjaan Diawas

Sumber data awal:

- `GET /api/auth/me`
- `GET /api/pengawas`
- `GET /api/pekerjaan`

Widget awal:

- Total pekerjaan yang diawas.
- Total lokasi unik.
- Total pagu pekerjaan yang diawas.
- Progress rata-rata.
- Distribusi pekerjaan per kecamatan.
- Daftar pekerjaan yang diawas.

Endpoint tambahan yang disarankan bila performa endpoint list mulai berat:

- `GET /api/pengawas-dashboard/summary`
- `GET /api/pengawas-dashboard/progress`
- `GET /api/pengawas-dashboard/issues`
- `GET /api/pengawas-dashboard/locations`

### 3. Daftar Pekerjaan Pengawas

Fitur:

- Tabel pekerjaan dengan filter tahun, kecamatan, desa, kegiatan, status progress, dan pencarian paket.
- Sort by pagu, progress, kecamatan, update terakhir.
- Detail pekerjaan menampilkan lokasi, pagu, kegiatan, pengawas/pendamping, progress tabel, foto, penerima, dan tiket.

Catatan:

- Prioritaskan server-side pagination/filter bila endpoint `GET /api/pekerjaan` sudah mendukung query.
- Bila belum mendukung, buat issue backend dan gunakan fallback client-side hanya untuk data kecil.

### 4. Detail Pekerjaan

Fitur:

- Tampilkan matriks output dengan slot foto 0% / 25% / 50% / 75% / 100%.
- Upload foto contextual melalui `POST /api/foto` dari modal slot, tanpa pilih komponen/penerima/keterangan manual.
- Tampilkan foto tersimpan per output dan per slot dari relasi pekerjaan.
- Sediakan fitur cetak foto dengan layout compact/table neobrutalism.
- Tambah penerima manfaat melalui `POST /api/penerima`.
- Tampilkan daftar penerima manfaat dari relasi pekerjaan.
- Tampilkan progress per pekerjaan dari `GET /api/progress/pekerjaan/{pekerjaanId}` dalam bentuk tabel editable.
- Update progress melalui `POST /api/progress/pekerjaan/{pekerjaanId}`.
- Tambah tiket dari pekerjaan melalui `POST /api/tiket`.

Acceptance criteria:

- Setelah mutasi, invalidate query pekerjaan, detail, dan dashboard.
- UI menampilkan state tersimpan, gagal, dan retry.

### 5. Tiket Pengawasan

Fitur:

- List tiket terkait pekerjaan user.
- Filter tiket terbuka, proses, selesai, prioritas tinggi.
- Detail komentar tiket dan tambah komentar.
- Bulk update bila role diizinkan.

### 6. Media dan Berkas

Fitur:

- Galeri media pekerjaan dari `GET /api/pekerjaan/{pekerjaan}/media`.
- Link unduh berkas bila tersedia dari endpoint `berkas`.
- Preview ringan untuk foto dan dokumen umum.

### 7. Profil Pengawas

Fitur:

- Tampilkan data user dari `auth/me`.
- Cocokkan NIP user dengan data pengawas bila tersedia.
- Tampilkan ringkasan pekerjaan sebagai pengawas utama dan pendamping.

## Kontrak Data Minimal

### Statistik Pengawas

```ts
type PengawasStatistics = {
  total_pengawas: number
  total_lokasi: number
  total_pagu: number
}
```

### Pengawas

```ts
type Pengawas = {
  id: number
  nama: string
  nip: string | null
  jabatan: string | null
  telepon: string | null
  jumlah_lokasi: number
  total_pagu: number
  created_at: string
  updated_at: string
}
```

### API Envelope

Backend Laravel resource umumnya mengembalikan data dalam `data`. API client harus menerima dua bentuk:

```ts
type ApiEnvelope<T> = { data: T }
type ApiListEnvelope<T> = { data: T[]; links?: unknown; meta?: unknown }
```

## Roadmap Implementasi

### Fase 0 - Bootstrap

- Inisialisasi project Bun.
- Setup React, TypeScript, Vite/Bun dev server.
- Setup lint/typecheck/test scripts.
- Setup Tailwind dan komponen UI dasar.
- Buat `.env.example`.

Output:

- App dapat dijalankan dengan `bun install` dan `bun run dev`.
- Halaman login dan shell dashboard kosong tersedia.

### Fase 1 - API Client dan Auth

- Buat `apiamis-client.ts` dengan base URL, timeout, bearer token, dan error mapping.
- Buat BFF auth route untuk login/logout/me.
- Simpan token dalam httpOnly cookie.
- Buat guard route untuk halaman dashboard.

Output:

- Login/logout berjalan.
- Refresh halaman tetap mempertahankan sesi.

### Fase 2 - Dashboard MVP

- Integrasi `pengawas/statistics`.
- Integrasi `dashboard/stats`.
- Integrasi list pekerjaan.
- Buat kartu KPI, grafik lokasi, tabel pekerjaan prioritas.
- Tambahkan loading, empty, dan error state.

Output:

- Pengawas dapat melihat ringkasan pekerjaan dan status utama.

### Fase 3 - Detail Pekerjaan

- Buat route `/pekerjaan` dan `/pekerjaan/:pekerjaanId`.
- Integrasi tab detail pekerjaan: penerima manfaat, matriks foto output, progress tabel, dan tiket.
- Tambahkan action update progress berbasis tabel dan upload foto contextual via slot/modal.

Output:

- Pengawas dapat memantau dan memperbarui pekerjaan dari satu layar.

### Fase 4 - Tiket dan Monitoring

- Buat halaman tiket.
- Tambahkan filter, komentar, dan bulk action.
- Tambahkan indikator SLA sederhana berbasis umur tiket.

Output:

- Isu lapangan bisa dipantau dan ditindaklanjuti.

### Fase 5 - Hardening

- Tambahkan Playwright smoke test login dan dashboard.
- Tambahkan unit test API client dan schema parser.
- Audit akses 401/403.
- Tambahkan logging client error ke `POST /api/client-error-reports`.
- Optimasi query dan tambah endpoint agregasi backend bila list endpoint terlalu berat.

## Perubahan Backend yang Mungkin Dibutuhkan

Endpoint yang sebaiknya ditambahkan di `apiamis` setelah MVP:

```text
GET /api/pengawas-dashboard/summary?tahun=
GET /api/pengawas-dashboard/pekerjaan?tahun=&kecamatan_id=&desa_id=&status=&q=&page=
GET /api/pengawas-dashboard/pekerjaan/{id}
GET /api/pengawas-dashboard/issues?tahun=&status=
```

Alasan:

- Menghindari komposisi data berat di frontend.
- Memastikan filtering tetap mengikuti `Pekerjaan::scopeByUserRole()`.
- Mengurangi N+1 request untuk progress, foto, penerima, dan tiket.

Minimal payload summary:

```ts
type PengawasDashboardSummary = {
  total_pekerjaan: number
  total_lokasi: number
  total_pagu: number
  rata_rata_progress: number
  pekerjaan_terlambat: number
  tiket_terbuka: number
  updated_at: string
}
```

## Risiko dan Mitigasi

- Endpoint list terlalu besar: gunakan pagination backend dan endpoint agregasi.
- Token bocor di browser: simpan token di httpOnly cookie melalui BFF.
- Data non-admin bocor: jangan bypass RBAC backend; semua query backend harus memakai token user asli.
- Response backend tidak konsisten: validasi runtime dengan Zod pada boundary API.
- Dashboard lambat: cache BFF 30-120 detik untuk summary non-mutasi, invalidate setelah update progress/foto/penerima/tiket.
- Bun runtime production belum pernah dipakai di project ini: mulai dari deployment staging, logging request, dan smoke test sebelum produksi.

## Definition of Done

- `bun install` berhasil.
- `bun run dev` menjalankan app lokal.
- `bun run typecheck` bersih.
- `bun test` bersih untuk unit test.
- Playwright smoke test login/dashboard lulus atau terdokumentasi bila credential test belum tersedia.
- Dashboard MVP menampilkan data dari `apiamis`.
- State 401, 403, 404, 422, dan 500 ditangani jelas di UI.
- Tidak ada token bearer tersimpan di `localStorage`.
- Dokumen environment dan command tersedia di repo.
