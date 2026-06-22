# Panduan Pengguna Arumanis — Panel Pengawasan

**Versi:** 1.0
**Akses:** Browser web (Chrome/Firefox/Edge)
**Base URL:** `/pengawasan`
**Server:** Bun/Hono — Single Page Application (React + Vite)

---

## Daftar Isi

1. [Mulai Cepat](#1-mulai-cepat)
2. [Navigasi Aplikasi](#2-navigasi-aplikasi)
3. [Panduan Fitur & Layar](#3-panduan-fitur--layar)
4. [Alur Kerja Inti](#4-alur-kerja-inti)
5. [Skenario Tepi & Penanganan Error](#5-skenario-tepi--penanganan-error)
6. [FAQ](#6-faq)
7. [Referensi API](#7-referensi-api)

---

## 1. Mulai Cepat

### 1.1 Login

Arumanis menggunakan autentikasi via **SSO Arumanis** atau **login manual**.

**Login Manual:**
1. Buka `/pengawasan/login`
2. Masukkan **Email** dan **Password** akun `apiamis`
3. Klik **Masuk**
4. Setelah berhasil, redirect ke halaman yang dituju sebelumnya

**Login SSO (Single Sign-On):**
- Jika URL mengandung parameter `?token=...`, `?access_token=...`, atau `?auth_token=...`, sistem otomatis menyinkronkan token SSO
- Tampilkan layar "Menyinkronkan sesi SSO..." selama proses
- Redirect otomatis setelah berhasil

**URL alternatif:** `/pengawasan/sign-in` (alias dari halaman login)

### 1.2 Sesi & Logout

- Sesi disimpan dalam httpOnly cookie (`pengawas_session`)
- Cookie dikirim otomatis di setiap request
- Logout melalui tombol **Keluar** di sidebar footer
- Setelah logout, redirect ke halaman login

### 1.3 Modal Selamat Datang

Setelah login pertama (atau saat `arumanis.welcome-hidden` belum diset di localStorage), modal **Selamat Datang** muncul dengan opsi:
- **Baca Panduan** → buka halaman `/pengawasan/panduan`
- **Tutup** → tutup modal, tampil lagi di sesi berikutnya
- **Jangan tampilkan lagi** → set localStorage, tidak tampil lagi

---

## 2. Navigasi Aplikasi

### 2.1 Struktur Rute

| Path | Halaman | Auth | Komponen |
|------|---------|------|----------|
| `/login` | Login | Tidak | `LoginPage` |
| `/sign-in` | Login (alias) | Tidak | `LoginPage` |
| `/` | Dashboard | Wajib | `DashboardPage` |
| `/pekerjaan` | Daftar Pekerjaan | Wajib | `PekerjaanPage` |
| `/pekerjaan/:pekerjaanId` | Detail Pekerjaan | Wajib | `PekerjaanDetailPage` |
| `/tiket` | Tiket / Isu | Wajib | `TiketPage` |
| `/panduan` | Panduan Pengguna | Wajib | `GuidePage` |
| `/profile` | Profil Pengguna | Wajib | `ProfilePage` |
| `*` | 404 (tidak ditemukan) | Wajib | `NotFoundPage` |

### 2.2 Guard Autentikasi (ProtectedRoute)

Semua rute kecuali `/login` dan `/sign-in` dilindungi `ProtectedRoute`:
1. Saat masuk, `ProtectedRoute` memanggil `GET /bff/auth/me`
2. **Loading:** tampilkan spinner "Memeriksa sesi..."
3. **Error / tidak terautentikasi:** redirect ke `/login` dengan parameter `?redirect=` dan `state.from` berisi path asal
4. **Sukses:** render `AppLayout` + halaman yang diminta

### 2.3 Base Path & SPA Fallback

- Seluruh aplikasi berjalan di **basename `/pengawasan`** (BrowserRouter)
- Server BFF (Bun/Hono) melayani static files dari `dist/` dan fallback ke `index.html` untuk semua rute yang tidak cocok dengan file statis atau endpoint API
- Endpoint `/health` tersedia di `/pengawasan/health` dan `/health` untuk pengecekan status server

### 2.4 Sidebar Navigasi

Setelah login, sidebar kiri menampilkan:

| Ikon | Label | Path |
|------|-------|------|
| LayoutDashboard | Dashboard | `/` |
| ClipboardList | Pekerjaan | `/pekerjaan` |
| MessageSquareText | Tiket | `/tiket` |
| BookOpenText | Panduan | `/panduan` |
| UserCircle2 | Profil | `/profile` |

- Sidebar bisa disembunyikan/ditampilkan dengan tombol toggle di topbar
- Status sidebar disimpan di localStorage (`arumanis.sidebar-open`)
- Otomatis collapse di layar < 1100px

---

## 3. Panduan Fitur & Layar

### 3.1 Dashboard (`/`)

**Fungsi:** Ringkasan pekerjaan yang diawasi oleh akun login.

**Komponen:**
- **Search & Filter Tahun:** toolbar atas untuk mencari nama paket dan memfilter tahun anggaran
- **KPI Cards (4):**
  - Jumlah paket pekerjaan
  - Belum isi progress (warning jika > 0)
  - Paket deviasi (danger jika > 0)
  - Foto belum lengkap (warning jika > 0)
- **Tabel "Pekerjaan yang diawas":**
  - Kolom: Paket (link ke detail), Progress (badge % / "Belum diisi"), Deviasi, Foto (badge status + count), Catatan (badge issues), Aksi (tombol Detail)
  - Setiap baris bisa diklik menuju `/pekerjaan/:id`
- **Section "Paket perlu perhatian":** menampilkan maksimal 8 paket dengan isu (progress, deviasi, foto)

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading | Spinner "Memuat ringkasan" |
| Error (401) | "Sesi tidak valid" + tombol "Masuk ulang" |
| Error (lainnya) | "Gagal memuat ringkasan" + tombol "Coba lagi" |
| Data kosong | "Tidak ada pekerjaan" + saran ubah filter |
| Sukses | Tabel + KPI cards |

### 3.2 Daftar Pekerjaan (`/pekerjaan`)

**Fungsi:** Daftar lengkap semua paket pekerjaan dengan pagination.

**Query Parameters:**
| Parameter | Contoh | Fungsi |
|-----------|--------|--------|
| `search` | `?search=jalan` | Filter nama paket |
| `tahun` | `?tahun=2025` | Filter tahun anggaran |
| `page` | `?page=2` | Halaman (default 1) |

**Komponen:**
- Toolbar: input search + input tahun
- Tabel: Paket (link), Lokasi (kecamatan/desa), Pagu (format Rp), Progress (progress bar + %), Update (tanggal)
- Pagination: tombol Sebelumnya/Berikutnya + label "Halaman X dari Y"

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading | Spinner "Memuat pekerjaan..." |
| Error 401 | "Sesi tidak valid" + tombol "Masuk ulang" |
| Error 403 | "Akses ditolak" |
| Error lain | "Gagal memuat pekerjaan" + tombol "Coba lagi" |
| Data kosong | "Tidak ada pekerjaan" + saran filter |
| Sukses | Tabel + pagination |

### 3.3 Detail Pekerjaan (`/pekerjaan/:pekerjaanId`)

**Fungsi:** Halaman utama untuk semua operasi CRUD pada satu paket pekerjaan.

**Parameter URL:** `pekerjaanId` (numeric ID dari pekerjaan)

**Hero Section:**
- Tombol **Kembali** → `/pekerjaan`
- Nama paket (judul besar)
- Badge status foto (Belum ada foto / Belum selesai / Lengkap)
- Badge sumber assignment (misal: `apiamis`)
- Metadata: lokasi, kegiatan, TA, pagu, progress bar
- Pengawas & Pendamping

**Tab Bar (sticky):** Terdapat 6 tab navigasi:

| Tab | Ikon | Fungsi |
|-----|------|--------|
| Ringkasan | Shield | Informasi detail pekerjaan |
| Output | FileText | CRUD output pekerjaan (komponen, satuan, volume, tipe) |
| Penerima | FileText | CRUD penerima manfaat |
| Foto | Camera | Upload & lihat dokumentasi foto |
| Progress | RefreshCcw | Input progress mingguan |
| Tiket | MessageSquareText | Lihat tiket terkait |

#### 3.3.1 Tab Ringkasan

Informasi detail pekerjaan dalam grid:
- Kegiatan, Tahun anggaran, Lokasi, Pengawas, Pendamping
- Nomor rekening, Pagu, Progress, Foto wajib
- Tanggal dibuat, diperbarui

**Output pekerjaan:** kartu per output dengan:
- Nama komponen, volume, satuan
- Label Opsional/Wajib (penerima_is_optional)
- Jumlah foto terupload

#### 3.3.2 Tab Penerima

**Form tambah/edit penerima:**
- Field: Nama (wajib), Jumlah Jiwa, NIK, Alamat
- Checkbox **Komunal**: jika aktif, field Jumlah Jiwa dan NIK dinonaktifkan
- Tombol: Tambah/Simpan, Batal, Reset

**Tabel daftar penerima:**
- Kolom: Nama, Tipe (Komunal/Individu), Identitas (Jiwa, NIK), Alamat, Dibuat, Aksi (Edit, Hapus)

**State Handling:**
| State | Tampilan |
|-------|----------|
| Belum ada penerima | "Belum ada penerima" + tombol tambah |
| Ada data | Tabel penerima |
| Hapus | ConfirmModal "Hapus penerima?" |

#### 3.3.3 Tab Foto

**Matriks foto:** grid per output x slot progress (0%, 25%, 50%, 75%, 100%)
- Setiap slot menampilkan thumbnail foto atau ikon "Kosong"
- Klik slot berisi → buka preview foto
- Klik slot kosong → buka modal upload
- Tombol **Cetak Foto** → generate PDF untuk print

**Upload foto modal:**
- Input koordinat GPS (manual + tombol GPS otomatis)
- File input (accept: `image/*`)
- Ekstraksi koordinat otomatis dari EXIF foto
- Tombol Unggah & Batal

**Preview foto modal:**
- Gambar besar + panel detail (output, slot, koordinat, validasi)
- Tombol: Ganti foto, Hapus foto

**Cetak Foto (PDF):**
- Jika <= 10 foto: layout portrait, 2 foto per halaman
- Jika > 10 foto: layout landscape, tabel matriks
- Buka tab baru → window.print()

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading detail | Spinner "Memuat detail pekerjaan..." |
| ID tidak valid | "Pekerjaan tidak valid" + kembali |
| Error/gagal muat | "Gagal memuat data" + kembali |
| Tidak ada output + ada foto | Grid foto biasa |
| Tidak ada foto sama sekali | "Belum ada foto" |
| Matriks siap | Grid slot per output |

#### 3.3.4 Tab Progress

**KPI Cards:** Total bobot, Deviasi, Progress terhitung, Minggu

**Tabel progress per minggu:**
- Dropdown pilih minggu aktif
- Kolom: Item, Satuan, Target, Rencana (input), Realisasi (input), Status (badge)
- Tombol **Simpan** (aktif jika ada perubahan)
- Badge "Tersimpan" muncul 2 detik setelah simpan berhasil

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading | Spinner "Memuat progress..." |
| Progress ada | Tabel + KPI |
| Progress null/gagal | "Progress belum tersedia" |
| Tidak ada item | "Belum ada item progress" |

#### 3.3.5 Tab Tiket

**Info bar:** jumlah total, terbuka, tertutup + tombol "Buka halaman tiket"

**Tabel tiket terkait:**
- Kolom: Subjek, Kategori, Prioritas, Status (badge warna), Dibuat

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading | Spinner "Memuat tiket..." |
| Ada tiket | Tabel |
| Belum ada | "Belum ada tiket" |

### 3.4 Tiket (`/tiket`)

**Fungsi:** Manajemen tiket isu lapangan.

**Query Parameters:**
| Parameter | Contoh | Fungsi |
|-----------|--------|--------|
| `status` | `?status=open` | Filter status |
| `kategori` | `?kategori=teknis` | Filter kategori |
| `pekerjaan_id` | `?pekerjaan_id=5` | Filter per pekerjaan |
| `search` | `?search=jembatan` | Cari subjek/deskripsi |
| `ticketId` | `?ticketId=12` | Pilih tiket tertentu |

**Layout 2 kolom:**
- **Kiri:** daftar tiket (kartu) dengan subjek, status badge, paket, prioritas, tanggal
- **Kanan:** detail tiket terpilih:
  - Header: subjek + nama paket
  - Detail grid: kategori, prioritas, status, dibuat
  - Body: deskripsi
  - Komentar (jika ada)
  - Form komentar: Textarea + Input + tombol "Simpan komentar"

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading daftar | Spinner "Memuat tiket..." |
| Error 401 | "Sesi tidak valid" |
| Error lain | "Gagal memuat tiket" |
| Tidak ada tiket | "Tidak ada tiket" + saran filter |
| Belum pilih tiket | "Pilih tiket" + instruksi |
| Tiket dipilih | Detail + komentar |

### 3.5 Profil (`/profile`)

**Fungsi:** Menampilkan data pengguna dan kecocokan data pengawas.

**Komponen:**
- **Identitas:** Nama, Email, NIP, Role, Permissions (badge)
- **Data pengawas** (dicocokkan via NIP): Nama, Jabatan, Telepon, Jumlah lokasi, Total pagu
- **Timestamp sesi:** Avatar, Gender, Dibuat, Diperbarui

**State Handling:**
| State | Tampilan |
|-------|----------|
| Loading | "Memuat profil..." |
| User null | "Profil tidak tersedia" |
| NIP tidak cocok | "Belum ada kecocokan NIP" |

### 3.6 Panduan (`/panduan`)

**Fungsi:** Panduan ringkas alur kerja pengawasan (berbeda dari USER_GUIDE.md — ini adalah halaman in-app guide).

**Section:**
- **Alur cepat:** 3 langkah (Buka Dashboard -> Detail -> Lengkapi Data)
- **Status foto:** penjelasan 3 status (Belum ada foto, Belum Selesai, Selesai)
- **Tab detail pekerjaan:** penjelasan 4 tab (Penerima, Foto, Progress, Tiket)
- **Aturan foto:** detail aturan validasi dokumentasi
- **Tiket:** cara penggunaan tiket

### 3.7 Halaman 404 (`*`)

**Tampilan:** "Halaman tidak ditemukan" + link "Kembali" ke dashboard.

---

## 4. Alur Kerja Inti

### 4.1 Alur: Pantau Dashboard

1. Login ke aplikasi
2. Dashboard menampilkan ringkasan semua pekerjaan
3. Perhatikan KPI: paket dengan progress 0%, deviasi, foto belum lengkap
4. Gunakan filter tahun dan search untuk mempersempit tampilan
5. Section "Paket perlu perhatian" menyoroti item yang membutuhkan tindakan
6. Klik nama paket untuk masuk ke detail

### 4.2 Alur: Tambah Penerima

1. Buka detail pekerjaan → tab **Penerima**
2. Klik "Buka form" (jika tertutup)
3. Isi **Nama** (wajib)
4. Centang **Komunal** jika penerima kelompok (jiwa & NIK tidak perlu diisi)
5. Isi Jumlah Jiwa & NIK (untuk individu)
6. Isi **Alamat** (opsional)
7. Klik **Tambah penerima**
8. Penerima baru muncul di tabel
9. Untuk edit: klik **Edit** di baris penerima
10. Untuk hapus: klik **Hapus** -> konfirmasi -> terhapus

### 4.3 Alur: Upload Foto

1. Buka detail pekerjaan → tab **Foto**
2. Lihat matriks: output (baris) x slot progress (kolom)
3. Klik slot **Kosong** untuk upload
4. Di modal upload:
   a. Masukkan **koordinat GPS** (manual atau klik tombol **GPS**)
   b. Pilih **file foto** (format gambar)
   c. Sistem otomatis mengekstrak koordinat dari EXIF foto jika tersedia
   d. Klik **Unggah foto**
5. Foto muncul di slot yang dipilih
6. Klik foto untuk **Preview** (lihat detail, ganti, atau hapus)
7. **Cetak Foto:** klik tombol untuk generate PDF dokumentasi

**Catatan:** Output dengan label "Opsional" (komunal) tidak terkait penerima spesifik. Output "Wajib" (individu) memerlukan penerima terkait.

### 4.4 Alur: Input Progress

1. Buka detail pekerjaan → tab **Progress**
2. Pilih **minggu aktif** dari dropdown
3. Untuk setiap item:
   - Isi **Rencana** (target volume minggu ini)
   - Isi **Realisasi** (volume aktual yang tercapai)
4. Setelah selesai, klik **Simpan**
5. Badge "Tersimpan" muncul sebagai konfirmasi
6. KPI otomatis memperbarui: deviasi, progress terhitung

### 4.5 Alur: Buat & Kelola Tiket

**Membuat tiket baru:**
1. Buka halaman **Tiket** (`/tiket`)
2. (Pembuatan tiket via API, belum ada form UI)
3. Tiket yang sudah dibuat muncul di daftar

**Menambahkan komentar:**
1. Pilih tiket dari daftar kiri
2. Scroll ke form komentar di panel kanan
3. Tulis komentar di Textarea atau Input singkat
4. Klik **Simpan komentar**
5. Komentar baru muncul di thread

**Filter tiket:**
- Gunakan parameter `?status=`, `?kategori=`, `?pekerjaan_id=`
- Cari dengan `?search=`

---

## 5. Skenario Tepi & Penanganan Error

### 5.1 Autentikasi & Sesi

| Skenario | Tampilan | Tindakan |
|----------|----------|----------|
| Belum login, akses halaman protected | Redirect ke `/login?redirect=<path>` | Login |
| Token expired / invalid (401) | "Sesi tidak valid" + tombol "Masuk ulang" | Klik "Masuk ulang" |
| Izin tidak cukup (403) | "Akses ditolak" | Hubungi admin |
| Sesi hilang di tengah kerja | Error 401 pada query berikutnya | Login ulang |

### 5.2 Data

| Skenario | Tampilan | Tindakan |
|----------|----------|----------|
| Daftar pekerjaan kosong | "Tidak ada pekerjaan" + saran filter | Ubah filter/search |
| Detail pekerjaan error | "Gagal memuat data" + tombol "Kembali" | Kembali ke daftar |
| Progress tidak tersedia | "Progress belum tersedia" | Hubungi admin jika seharusnya ada |
| Belum ada penerima | "Belum ada penerima" | Tambah penerima baru |
| Belum ada foto | "Belum ada foto" | Upload foto |
| Tidak ada tiket | "Tidak ada tiket" / "Belum ada tiket" | Buat tiket baru |
| Belum ada komentar | "Belum ada komentar" | Tambah komentar |

### 5.3 Upload & Form

| Skenario | Tampilan | Tindakan |
|----------|----------|----------|
| Upload tanpa file | Tombol disabled | Pilih file dulu |
| GPS gagal | "Gagal mendapatkan lokasi dari GPS" | Cek izin lokasi browser |
| GPS tidak didukung | "Browser tidak mendukung geolocation" | Input koordinat manual |
| Ekstraksi EXIF gagal | "Gagal mengekstrak koordinat" | Input manual atau lanjutkan |
| Foto error load | onerror handler -> gambar disembunyikan | Cek URL/koneksi |
| Popup diblokir (cetak) | "Popup diblokir. Mohon izinkan popup untuk mencetak." | Izinkan popup |

### 5.4 Jaringan & Server

| Skenario | Tampilan | Tindakan |
|----------|----------|----------|
| Server down | Error query -> tampilkan error + tombol "Coba lagi" | Klik "Coba lagi" |
| Jaringan putus | Network error -> tampilkan error | Periksa koneksi |
| BFF error (500) | "Exception in BFF proxy" message | Hubungi admin |
| Login gagal | "Login gagal" pesan error di form | Periksa email/password |

### 5.5 Navigasi

| Skenario | Perilaku |
|----------|----------|
| Browser Back dari detail | Kembali ke daftar pekerjaan (React Router) |
| Browser Refresh | React Router menjaga path; ProtectedRoute memeriksa sesi lagi |
| URL manual /pengawasan/xxx | 404 "Halaman tidak ditemukan" + link "Kembali" |
| Sidebar toggle | Status persist di localStorage |

### 5.6 Konsistensi Visual

- **CSS Variables** digunakan untuk theme konsisten
- **Breakpoint:** sidebar collapse di < 1100px, mobile backdrop klik untuk tutup
- **Font:** sistem font stack
- **Loading:** spinner Loader2 dari lucide-react
- **Empty state:** komponen `EmptyState` konsisten di semua halaman

---

## 6. FAQ

**Q: Apa itu Arumanis?**
A: Panel pengawasan berbasis web untuk memantau pekerjaan lapangan, mengelola penerima, upload dokumentasi foto, input progress, dan melacak tiket isu.

**Q: Bagaimana cara login?**
A: Buka `/pengawasan/login`. Masukkan email dan password akun `apiamis`. Atau gunakan SSO dengan token di URL.

**Q: Kok data tidak muncul?**
A: Cek filter tahun dan search. Jika muncul error 401, sesi sudah habis — klik "Masuk ulang".

**Q: Bagaimana aturan foto?**
A: Setiap output memiliki 5 slot (0%, 25%, 50%, 75%, 100%). Foto wajib diunggah untuk setiap slot sesuai penerima yang ditugaskan.

**Q: Apa bedanya penerima Komunal dan Individu?**
A: **Komunal** untuk kelompok (tidak perlu data jiwa/NIK per orang). **Individu** untuk perorangan (wajib ada data identitas).

**Q: Progress tidak bisa disimpan?**
A: Pastikan ada perubahan di field Rencana/Realisasi. Tombol Simpan aktif hanya jika ada perubahan.

**Q: GPS tidak berfungsi?**
A: Pastikan izin lokasi browser diaktifkan. Jika tetap gagal, input koordinat manual.

**Q: Tiket tidak bisa dibuat dari halaman ini?**
A: Pembuatan tiket dilakukan via backend API. Halaman tiket saat ini mendukung viewing dan komentar.

**Q: Data kosong / sebagian?**
A: Beberapa data bersumber dari relasi backend. Jika data tidak lengkap, kemungkinan data master belum diisi di sistem `apiamis`.

**Q: Aplikasi error terus?**
A: Cek console browser (F12) untuk detail error. Laporkan ke admin dengan screenshot dan pesan error.

---

## 7. Referensi API

### 7.1 Arsitektur

```
Browser -> BFF (Bun/Hono) -> Backend API (apiamis)
         |
    Static files (dist/)
```

- **BFF Prefix:** `/pengawasan/bff`
- **API Prefix:** `/pengawasan/bff/api`
- **Backend target:** `APIAMIS_BASE_URL` (default: `http://apiamis.test/api`)
- **Autentikasi:** Cookie `pengawas_session` (httpOnly) -> Bearer token forward ke backend
- **Semua request** menggunakan `credentials: 'include'`

### 7.2 Endpoint BFF Auth

| Method | Path | Deskripsi | Request Body | Response |
|--------|------|-----------|-------------|----------|
| POST | `/bff/auth/login` | Login manual | `{ email, password }` | `{ user }` + set cookie |
| POST | `/bff/auth/sync-token` | Sinkron token SSO | `{ token }` | `{ message }` + set cookie |
| GET | `/bff/auth/me` | Cek sesi (forward) | — | `{ user }` |
| POST | `/bff/auth/logout` | Logout | — | `{ message }` + hapus cookie |

### 7.3 Endpoint API (via BFF Proxy)

Semua endpoint menggunakan prefix `/bff/api/` di depan setiap path.

#### 7.3.1 Dashboard

| Method | Path | Deskripsi | Parameter |
|--------|------|-----------|-----------|
| GET | `/dashboard/stats` | Statistik dashboard | `?tahun=` |

**Response (DashboardStats):**
```json
{
  "totalKegiatan": 0,
  "totalPagu": 0,
  "kegiatanPerTahun": [{ "name": "2025", "value": 10 }],
  "availableYears": ["2024", "2025"],
  "totalPekerjaan": 0,
  "totalPaguPekerjaan": 0,
  "pekerjaanPerKecamatan": [],
  "totalKontrak": 0,
  "totalNilaiKontrak": 0,
  "totalOutput": 0,
  "totalPenerima": 0
}
```

#### 7.3.2 Pekerjaan

| Method | Path | Deskripsi | Parameter |
|--------|------|-----------|-----------|
| GET | `/pekerjaan` | Daftar pekerjaan | `?per_page=&page=&tahun=&search=&sort_by=&sort_direction=&summary=` |
| GET | `/pekerjaan/:id` | Detail pekerjaan | — |
| GET | `/pekerjaan/:id/media` | Media pekerjaan | — |

**Response Pekerjaan (paginated):**
```json
{
  "data": [
    {
      "id": 1,
      "nama_paket": "Pembangunan Jalan",
      "pagu": 500000000,
      "progress_total": 45.5,
      "deviasi": -2.3,
      "foto_count": 3,
      "foto_required_count": 5,
      "foto_status": "belum_selesai",
      "kecamatan": { "id": 1, "nama_kecamatan": "Kec A" },
      "desa": { "id": 1, "nama_desa": "Desa B" },
      "kegiatan": { "id": 1, "nama_kegiatan": "Infrastruktur", "tahun_anggaran": "2025" },
      "pengawas": { "id": 1, "nama": "Budi" },
      "pendamping": { "id": 2, "nama": "Siti" },
      "penerima_count": 10,
      "assignment_sources": ["apiamis"],
      "created_at": "2025-01-15T00:00:00.000Z",
      "updated_at": "2025-06-01T00:00:00.000Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 20, "total": 100 },
  "links": {}
}
```

#### 7.3.3 Penerima

| Method | Path | Deskripsi | Body |
|--------|------|-----------|------|
| GET | `/penerima/pekerjaan/:id` | Daftar penerima per pekerjaan | — |
| POST | `/penerima` | Tambah penerima | `{ pekerjaan_id, nama, jumlah_jiwa?, nik?, alamat?, is_komunal? }` |
| PUT | `/penerima/:id` | Update penerima | `{ nama?, jumlah_jiwa?, nik?, alamat?, is_komunal? }` |
| DELETE | `/penerima/:id` | Hapus penerima | — |

#### 7.3.4 Foto

| Method | Path | Deskripsi | Body |
|--------|------|-----------|------|
| POST | `/foto` | Upload foto | `FormData: pekerjaan_id, komponen_id, keterangan, koordinat, penerima_id?, image` |
| DELETE | `/foto/:id` | Hapus foto | — |

#### 7.3.5 Progress

| Method | Path | Deskripsi | Body |
|--------|------|-----------|------|
| GET | `/progress/pekerjaan/:id` | Progress report | — |
| POST | `/progress/pekerjaan/:id` | Update progress | `{ items: [...], week_count }` |

**Response ProgressReportView:**
```json
{
  "pekerjaan": { "id": 1, "nama": "..." },
  "kegiatan": { "nama_kegiatan": "...", "sumber_dana": "..." },
  "kontrak": { "nilai_kontrak": 500000000 },
  "penyedia": { "nama": "PT ABC" },
  "items": [
    {
      "nama_item": "Pekerjaan Tanah",
      "satuan": "m3",
      "target_volume": 100,
      "bobot": 20,
      "weekly_data": {
        "1": { "rencana": 10, "realisasi": 8 }
      }
    }
  ],
  "totals": { "total_bobot": 100, "total_weighted_progress": 12.5 },
  "max_minggu": 12
}
```

#### 7.3.6 Tiket

| Method | Path | Deskripsi | Body/Params |
|--------|------|-----------|-------------|
| GET | `/tiket` | Daftar tiket | `?per_page=&status=&kategori=&pekerjaan_id=` |
| POST | `/tiket` | Buat tiket | `{ pekerjaan_id?, subjek, deskripsi, kategori, prioritas }` |
| POST | `/tiket/:id/comments` | Tambah komentar | `{ message }` |

#### 7.3.7 Checklist

| Method | Path | Deskripsi | Body/Params |
|--------|------|-----------|-------------|
| GET | `/pekerjaan-checklist` | Matriks checklist | `?per_page=&page=` |
| POST | `/pekerjaan-checklist/toggle` | Toggle checklist | `{ pekerjaan_id, checklist_item_id, is_checked, notes? }` |

#### 7.3.8 Pengawas

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/pengawas` | Daftar pengawas |
| GET | `/pengawas/statistics` | Statistik pengawas |

### 7.4 Format Response

**Success Envelope:**
```json
{
  "data": { ... },
  "message": "optional",
  "success": true
}
```

**Error Envelope:**
```json
{
  "message": "Pesan error",
  "errors": { "field": ["Error 1", "Error 2"] }
}
```

**Paginated Response:**
```json
{
  "data": [ ... ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 20, "total": 100 },
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." }
}
```

### 7.5 Kode Error

| Status | Makna | Handling Client |
|--------|-------|-----------------|
| 200 | Sukses | Render data |
| 204 | Sukses tanpa konten | Ignore/null response |
| 400 | Bad Request | Tampilkan `message` |
| 401 | Unauthorized | Redirect ke `/login` |
| 403 | Forbidden | Tampilkan "Akses ditolak" |
| 404 | Not Found | Tampilkan halaman 404 |
| 422 | Validation Error | Tampilkan `errors` field |
| 500 | Server Error | Tampilkan error + "Coba lagi" |

### 7.6 TypeScript Types

Key types dari `src/lib/types.ts`:
- `AuthUser` — data user login (id, name, email, nip, roles, permissions)
- `DashboardStats` — statistik dashboard lengkap
- `Pekerjaan` — item pekerjaan (ringkas)
- `PekerjaanDetail` — detail + nested foto, penerima, output, progress
- `Penerima` — penerima manfaat
- `Foto` — foto dengan metadata koordinat
- `ProgressReportView` — view progress dengan items + totals
- `Tiket` — tiket dengan komentar
- `ApiEnvelope<T>` — response wrapper `{ data?, message?, success?, errors? }`
- `PaginatedResponse<T>` — pagination wrapper `{ data, meta?, links? }`

---

*Dokumen ini dihasilkan dari audit kode sumber aplikasi Arumanis Panel Pengawasan v1.0.*
*Untuk pembaruan, jalankan ulang audit atau periksa source code di direktori proyek.*
