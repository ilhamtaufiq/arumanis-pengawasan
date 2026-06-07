# Backlog Implementasi Dashboard Pengawas

Tanggal: 2026-06-06

Status singkat:

- P0 selesai.
- P1 selesai.
- P2 selesai.
- P3 selesai.
- P4 selesai sebagian.
- P5 selesai sebagian.
- P6-P7 masih pending.

## Environment Backend

- Local/development API: `http://apiamis.test/api`
- Deployment/server API: `https://apiamis.cianjur.space/api`
- Semua kode harus membaca URL dari `APIAMIS_BASE_URL`.
- Jangan hardcode URL backend di source code.

## P0 - Fondasi Project

Status: selesai.

Yang sudah ada:

- `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`
- `src/styles/globals.css`
- struktur `src/app`, `src/components`, `src/lib`, `src/server`, `src/pages`
- `.env.example`
- layout shell dashboard dasar

Sisa jika ada:

- rapikan komponen UI minor yang belum dipakai
- tambah dokumentasi deployment jika server target berubah

## P1 - Auth dan API Client

Status: selesai.

Yang sudah ada:

- API client `apiamis`
- route BFF `POST /bff/auth/login`, `GET /bff/auth/me`, `POST /bff/auth/logout`
- httpOnly cookie untuk token
- halaman login
- route guard
- query client global

Sisa jika ada:

- tambah handling `403` yang lebih spesifik di UI bila nanti role matrix bertambah
- perlu hardening kalau format response backend berubah

## P2 - Dashboard Pekerjaan Diawas

Status: selesai.

Yang sudah ada:

- dashboard dibatasi ke pekerjaan yang diawas oleh master pengawas
- statistik pekerjaan hasil filter dashboard
- list pekerjaan yang diawas
- KPI cards
- ringkasan pekerjaan dengan indikator progress, deviasi, dan foto

Sisa jika ada:

- optimasi request dashboard kalau payload backend bertambah besar
- tambah filter lanjutan bila dibutuhkan user operasional
- jika perlu, tambahkan ringkasan tiket khusus pekerjaan yang dipilih

## P3 - Detail Pekerjaan

Status: selesai.

Yang sudah ada:

- route `/pekerjaan`
- route `/pekerjaan/:pekerjaanId`
- detail pekerjaan dalam tab Penerima Manfaat, Foto, Progress, dan Tiket
- matriks output pekerjaan dengan slot foto 0% / 25% / 50% / 75% / 100%
- modal upload foto contextual per slot, tanpa pilih komponen/penerima/keterangan manual
- output komunal menampilkan penerima komunal jika tersedia, jika tidak tampil `-`
- status foto mengikuti aturan: `Belum ada foto` jika kosong total, `Belum Selesai` jika output/volume dan jumlah foto belum memenuhi minimal
- preview foto per output dan per slot
- cetak foto dengan layout compact/table neobrutalism
- tambah, edit, dan hapus penerima manfaat
- daftar penerima manfaat dalam tabel
- field Jumlah Jiwa dan NIK disabled saat mode Komunal aktif
- progress pekerjaan dalam bentuk tabel editable dengan selector minggu aktif, kolom rencana dan realisasi volume
- tambah tiket dari pekerjaan
- daftar tiket pekerjaan

Yang masih bisa dirapikan:

- validasi progress per baris bisa diperketat jika backend sudah punya aturan lebih detail
- preview foto dan grouping output bisa ditingkatkan kalau backend menyediakan relasi penerima/output yang lebih eksplisit

## P4 - Tiket dan Monitoring Isu

Status: selesai sebagian.

Yang sudah ada:
- Halaman tiket dengan filter (status, kategori, pencarian).
- Detail tiket dengan kategori, prioritas, dan deskripsi penuh.
- Daftar tiket pekerjaan dan kemampuan menambah komentar tiket.

Yang masih perlu dikerjakan:
- Bulk action menggunakan `POST /tiket/bulk-update`.
- Indikator SLA yang lebih eksplisit (misal umur tiket/badge "Perlu tindakan").
- Attachment preview.

## P5 - Profil dan Personalisasi Pengawas

Status: selesai sebagian.

Yang sudah ada:
- Profil dengan ringkasan role dan permission pengguna.
- Tampilan identitas lengkap dan pencocokan otomatis data NIP dengan data master Pengawas.
- Tampilan detail pekerjaan pengawas (jumlah lokasi, total pagu) bila NIP cocok.

Yang masih perlu dikerjakan:
- Menyimpan preferensi ringan pengguna (misalnya filter terakhir yang dipakai) secara persisten atau *client-side*.

## P6 - Backend Aggregation Gap

Status: pending.

Tujuan:

- mengurangi request berlebih
- menghindari N+1 untuk progress, foto, penerima, dan tiket

Usulan endpoint backend:

- `GET /api/pengawas-dashboard/summary`
- `GET /api/pengawas-dashboard/pekerjaan`
- `GET /api/pengawas-dashboard/pekerjaan/{id}`
- `GET /api/pengawas-dashboard/issues`

## P7 - Quality, Testing, dan Deployment

Status: pending sebagian.

Yang sudah ada:

- `bun test`
- `bun run typecheck`
- `bun run build`

Yang masih perlu dikerjakan:

- smoke test browser untuk login dan dashboard
- verifikasi deployment server
- observability client error
- review security production

## Prioritas Berikutnya

1. Selesaikan sisa fitur P4 (Bulk update tiket, SLA) dan P5 (Preferensi ringan).
2. Mulai rancang agregasi backend (P6) di `apiamis` jika performa list pekerjaan mulai terasa berat, guna menghindari N+1 problem.
3. Tutup P7 dengan *smoke test* e2e menggunakan Playwright dan *hardening* ke arah *production-ready*.
