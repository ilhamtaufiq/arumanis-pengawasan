# AI Agent Guide

Panduan ini berlaku untuk agent yang bekerja di repo `C:\laragon\www\pengawas`.

## Aturan Lokal

- Baca dan ikuti `C:\Users\asusg\.codex\RTK.md`.
- Semua command shell harus diprefix `rtk`. Untuk cmdlet PowerShell, gunakan pola:

```powershell
rtk powershell -Command "Get-ChildItem -Force"
```

- Workspace ini berada di `C:\laragon\www\pengawas`.
- Backend referensi berada di `C:\laragon\www\apiamis`.
- Jangan mengubah backend `apiamis` kecuali user secara eksplisit meminta perubahan backend.
- Jangan menyimpan credential, token, dump database, atau data produksi ke repo.

## Tujuan Project

Project ini adalah dashboard khusus pengawas dengan stack full stack Bun yang mengambil data dari backend Laravel `apiamis`.

Peran app:

- UI dashboard untuk pengawas.
- Bun BFF untuk auth proxy, API proxy, response normalization, timeout, dan caching singkat.
- Bukan sumber business logic utama. Business logic dan RBAC tetap di `apiamis`.
- Dashboard hanya menampilkan pekerjaan yang benar-benar diawas oleh akun pengawas yang login.

## Stack yang Dipakai

- Bun untuk runtime, package manager, script runner, server, dan test.
- React + TypeScript untuk UI.
- TanStack Query untuk server state.
- TanStack Router atau React Router untuk routing. Jika belum ada implementasi, prioritaskan TanStack Router.
- Tailwind CSS dan komponen reusable untuk UI.
- Zod untuk validasi response di boundary API.
- Hono atau `Bun.serve` untuk server/BFF. Jika route BFF mulai lebih dari beberapa endpoint, gunakan Hono.

## Command Standar

Gunakan command berikut setelah project di-bootstrap:

```powershell
rtk bun install
rtk bun run dev
rtk bun run build
rtk bun run typecheck
rtk bun test
```

Jika ada Playwright:

```powershell
rtk bunx playwright test
```

## Integrasi Backend

Base URL backend harus dikonfigurasi lewat environment:

```env
APIAMIS_BASE_URL=http://apiamis.test/api
API_TIMEOUT_MS=15000
```

URL resmi environment:

- Local/development: `http://apiamis.test/api`
- Deployment/server: `https://apiamis.cianjur.space/api`

Jangan hardcode base URL di source code. Selalu baca dari `APIAMIS_BASE_URL`, dan pastikan `.env.production` memakai `https://apiamis.cianjur.space/api`.

Endpoint penting:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /pengawas/statistics`
- `GET /pengawas`
- `GET /dashboard/stats`
- `GET /pekerjaan`
- `GET /pekerjaan/{id}`
- `GET /progress/pekerjaan/{pekerjaanId}`
- `POST /progress/pekerjaan/{pekerjaanId}`
- `POST /foto`
- `POST /penerima`
- `GET /penerima/pekerjaan/{pekerjaanId}`
- `GET /tiket`
- `POST /tiket`

Backend Laravel biasanya membungkus response dalam `data`. API client harus menangani:

```ts
type ApiEnvelope<T> = { data: T }
type ApiListEnvelope<T> = { data: T[]; links?: unknown; meta?: unknown }
```

## Auth dan Security

- Jangan simpan bearer token di `localStorage`.
- Token dari `apiamis` harus disimpan oleh BFF sebagai httpOnly cookie.
- Semua request dari BFF ke `apiamis` harus menggunakan bearer token user yang sedang login.
- Jika backend mengembalikan 401, bersihkan sesi lokal dan arahkan ke login.
- Jika backend mengembalikan 403, tampilkan forbidden state, jangan retry tanpa aksi user.
- Jangan membuat bypass role di frontend. Frontend hanya menyembunyikan action; backend tetap otoritas.

## Pola Kode

- Letakkan akses API di `src/lib/api`.
- Letakkan komponen route di `src/app/routes`.
- Letakkan komponen reusable di `src/components`.
- Letakkan helper format uang, tanggal, persen, dan nomor di `src/lib/format`.
- Gunakan TypeScript strict.
- Validasi response penting dengan Zod sebelum masuk ke UI.
- Gunakan TanStack Query key yang stabil, contoh:

```ts
['pengawas', 'statistics']
['dashboard', 'stats', { tahun }]
['pekerjaan', 'list', filters]
['pekerjaan', 'detail', pekerjaanId]
['tiket', 'list', filters]
```

## UI/UX Dashboard

- Dashboard adalah layar kerja, bukan landing page marketing.
- Tampilkan KPI penting di viewport pertama.
- Semua tabel harus punya loading, empty, error, dan pagination/filter state.
- Format rupiah harus konsisten.
- Jika tidak ada grafik, utamakan ringkasan tabel dengan indikator status yang jelas.
- Aksi mutasi harus memberi feedback sukses/gagal dan invalidate query terkait.
- Hindari layout yang terlalu longgar; dashboard operasional harus padat dan mudah dipindai.

## Backend Contract Notes

Temuan awal dari backend:

- `PengawasController::statistics()` hanya menyediakan total dasar.
- `PengawasResource` menghitung `jumlah_lokasi` dan `total_pagu` dari relasi `pekerjaanAsPengawas`.
- `Pekerjaan::scopeByUserRole()` membatasi data non-admin berdasarkan assignment, kegiatan-role, atau kecocokan NIP.

Jika dashboard membutuhkan agregasi detail, usulkan endpoint backend baru daripada melakukan banyak request dari frontend:

```text
GET /api/pengawas-dashboard/summary
GET /api/pengawas-dashboard/pekerjaan
GET /api/pengawas-dashboard/pekerjaan/{id}
GET /api/pengawas-dashboard/issues
```

Halaman detail pekerjaan dipersempit ke fitur inti dan dibagi ke tab:

- Tab Penerima Manfaat: form input dan daftar data tersimpan.
- Tab Penerima Manfaat: form input, edit, hapus, dan daftar data tersimpan; saat Komunal aktif, input Jumlah Jiwa dan NIK nonaktif.
- Tab Foto: matriks output dengan slot foto 0% / 25% / 50% / 75% / 100%, modal upload contextual via dropzone, jika output komunal gunakan penerima komunal bila tersedia, dan cetak foto dengan layout neobrutalism.
- Status foto harus dibaca dari aturan backend: `Belum ada foto` untuk tanpa foto sama sekali, `Belum Selesai` untuk output/volume yang belum memenuhi kebutuhan minimal.
- Tab Progress: tabel editable dengan selector minggu aktif, kolom `Rencana` dan `Realisasi`, serta input volume numerik/decimal.
- Tab Tiket: form tambah tiket dan daftar tiket pekerjaan.

## Testing

Minimal sebelum menyelesaikan perubahan:

- Jalankan `rtk bun run typecheck` bila script tersedia.
- Jalankan `rtk bun test` bila ada test.
- Untuk perubahan UI signifikan, jalankan app dan verifikasi di browser.
- Test auth boundary: unauthenticated, authenticated, 401, dan 403.
- Test loading, empty, error, dan success state untuk data dashboard.

Jika test tidak bisa dijalankan karena dependency atau credential belum ada, tulis alasan spesifik di final response.

## Saat Mengedit

- Gunakan `apply_patch` untuk edit manual.
- Jangan menghapus perubahan user.
- Jangan melakukan refactor besar di luar scope tugas.
- Jangan mengubah nama endpoint backend tanpa memeriksa route `apiamis`.
- Jika perlu membaca backend, prioritaskan file berikut:

```text
C:\laragon\www\apiamis\routes\api.php
C:\laragon\www\apiamis\app\Http\Controllers\Api\PengawasController.php
C:\laragon\www\apiamis\app\Models\Pengawas.php
C:\laragon\www\apiamis\app\Models\Pekerjaan.php
C:\laragon\www\apiamis\app\Http\Resources\PengawasResource.php
```

## Definition of Done untuk Agent

- Perubahan sesuai `IMPLEMENTATION_PLAN.md`.
- Command verifikasi yang relevan sudah dijalankan atau kegagalannya dijelaskan.
- Tidak ada credential baru di repo.
- Tidak ada token disimpan di browser storage.
- Integrasi API memakai `APIAMIS_BASE_URL`, bukan URL hardcoded.
- Final response menyebut file yang diubah dan hasil verifikasi.
