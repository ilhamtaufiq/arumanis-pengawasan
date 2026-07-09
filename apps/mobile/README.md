# Arumanis Pengawasan — Aplikasi Mobile

Aplikasi Android/iOS untuk **pengawas lapangan** — memantau pekerjaan, mendokumentasikan foto progress, mencatat estimasi progress, dan mengelola tiket. Terhubung langsung ke API **APIAMIS** (Laravel), tanpa melalui BFF web.

| | |
|---|---|
| **Nama app** | Arumanis Pengawasan |
| **Package** | `space.cianjur.pengawas` |
| **Stack** | Expo 52 · React Native · Expo Router |
| **Backend** | `http://apiamis.test/api` (dev) · `https://apiamis.cianjur.space/api` (prod) |

---

## Daftar Isi

- [Panduan Penggunaan](#panduan-penggunaan)
  - [Mulai & Login](#1-mulai--login)
  - [Navigasi Utama](#2-navigasi-utama)
  - [Detail Pekerjaan](#3-detail-pekerjaan)
  - [Upload Foto](#4-upload-foto)
  - [Progress Estimasi](#5-progress-estimasi)
  - [Tiket](#6-tiket)
  - [Notifikasi & Profil](#7-notifikasi--profil)
  - [Mode Offline](#8-mode-offline)
  - [GPS & Lokasi](#9-gps--lokasi)
  - [Pembaruan Aplikasi (OTA)](#10-pembaruan-aplikasi-ota)
  - [Penanganan Masalah](#11-penanganan-masalah)
- [Setup Pengembang](#setup-pengembang)
- [Build & OTA](#build--ota)

---

## Panduan Penggunaan

Panduan ini untuk **pengawas lapangan** yang memakai APK/Expo build. Akun harus sudah terdaftar sebagai pengawas di APIAMIS dan memiliki assignment pekerjaan.

### 1. Mulai & Login

1. Buka aplikasi **Arumanis Pengawasan**.
2. Pada layar login, masukkan **email** dan **password** akun pengawas (sama dengan portal Arumanis/APIAMIS).
3. Alternatif: tap **Masuk dengan Google** jika akun terhubung ke Google SSO.
4. Setelah login berhasil, Anda diarahkan ke **Dashboard**.

**Catatan:** Saat pertama kali login setelah instalasi, aplikasi meminta **GPS aktif** dan **izin lokasi** (termasuk *Selalu* di Android). Tanpa ini, aplikasi tidak dapat digunakan untuk pengawasan lapangan.

### 2. Navigasi Utama

| Tab / Area | Fungsi |
|---|---|
| **Dashboard** | Ringkasan KPI, filter paket, daftar pekerjaan yang perlu perhatian |
| **Pekerjaan** | Daftar lengkap paket yang diawasi, dengan pencarian & filter tahun |
| **Tiket** | Tiket dukungan lintas pekerjaan |
| **Ikon profil** (header kanan) | Data akun, status GPS, logout |
| **Ikon lonceng** (header) | Notifikasi real-time |

Dari Dashboard atau Pekerjaan, **tap kartu paket** untuk membuka **Detail Pekerjaan**.

### 3. Detail Pekerjaan

Setiap pekerjaan memiliki tab berikut:

| Tab | Kegunaan |
|---|---|
| **Ringkasan** | Data kontrak, lokasi, jumlah foto/output/penerima |
| **Output** | Komponen pekerjaan (dasar matriks foto & progress) |
| **Penerima** | Daftar penerima manfaat (individu/komunal) |
| **Foto** | Matriks dokumentasi 0% / 25% / 50% / 75% / 100% per output |
| **Progress** | Estimasi progress fisik & keuangan per tanggal |
| **Tiket** | Tiket khusus pekerjaan ini |

Gunakan **tab bar horizontal** di bawah header untuk berpindah tab. Geser kiri/kanan jika tab tidak muat di layar.

### 4. Upload Foto

1. Buka tab **Foto** pada detail pekerjaan.
2. Tap slot progress yang ingin diisi (mis. **50%** pada komponen tertentu).
3. Pilih sumber: **Kamera** atau **Galeri**.
4. Aplikasi otomatis mengisi **koordinat** dari:
   - EXIF foto, atau
   - GPS / jaringan seluler perangkat, atau
   - lokasi terakhir yang tersimpan.
5. Periksa koordinat di modal. Jika perlu, tap **Lokasi perangkat** atau isi manual.
6. Tap **Unggah**.

**Validasi koordinat** bersifat informatif — foto tetap bisa diunggah meski koordinat di luar desa proyek; status validasi disimpan sebagai catatan di server.

Jika koneksi lemah, upload masuk **antrean** dan dikirim otomatis saat online kembali (banner antrean di tab Foto).

### 5. Progress Estimasi

1. Buka tab **Progress**.
2. Pilih **Progress Fisik** atau **Progress Keuangan**.
3. Di kolom **Rencana** atau **Realisasi**:
   - Isi **Tanggal** (`YYYY-MM-DD`)
   - Isi **Nilai (%)** (0–100)
   - Tap **Tambah**
4. Riwayat tersortir per tanggal. Tap **Hapus** untuk menghapus catatan.

Ringkasan **Rencana terakhir**, **Realisasi terakhir**, dan **Deviasi** ditampilkan di atas form.

### 6. Tiket

**Dari tab Tiket global** atau **tab Tiket di detail pekerjaan:**

1. Tap **+ Buat tiket baru**.
2. Isi subjek, deskripsi, kategori, dan prioritas.
3. Tap **Buat tiket**.

Kategori **Lapangan** dan **Bug** otomatis diset prioritas tinggi.

### 7. Notifikasi & Profil

- **Notifikasi:** tap ikon lonceng di header → panel notifikasi. Tap item untuk membuka pekerjaan terkait.
- **Profil:** tap inisial nama di header → lihat NIP, role, total lokasi/pagu, status pelacakan GPS, tombol **Keluar**.

### 8. Mode Offline

Aplikasi menyimpan data penting di perangkat (**24 jam**) agar tetap bisa dibaca tanpa internet.

| Bisa offline | Syarat |
|---|---|
| Login / buka app | Pernah login sukses; sesi masih valid |
| Daftar pekerjaan | Pernah dibuka saat online |
| Detail pekerjaan | Paket tersebut pernah dibuka saat online |
| Tab Ringkasan, Output, Foto | Ikut cache detail |
| Tab Penerima, Progress, Tiket | Tab pernah dibuka saat online |

Saat offline, banner **Mode offline** muncul di detail pekerjaan. **Menyimpan** data baru (foto antrean kecuali, progress, tiket, penerima) membutuhkan koneksi.

**Tips lapangan:** Sebelum ke lokasi tanpa sinyal, buka app saat masih online dan buka setiap pekerjaan + tab yang dibutuhkan.

### 9. GPS & Lokasi

| Fitur | Perilaku |
|---|---|
| **Wajib saat buka app** | GPS aktif + izin lokasi foreground & background |
| **Pelacakan background** | Koordinat dikirim ke server secara berkala (presence) |
| **Upload foto** | Prioritas EXIF → GPS → jaringan seluler → cache lokasi terakhir |
| **Tanpa paket data** | Posisi dari menara seluler tetap dicoba jika sinyal GSM ada |

Jika GPS lambat, tunggu beberapa detik atau isi koordinat manual di modal foto.

### 10. Pembaruan Aplikasi (OTA)

Aplikasi dapat menerima **pembaruan JavaScript** tanpa instal ulang APK:

- Banner muncul saat ada update (unduh → **Terapkan sekarang**).
- Reload ditunda aman — tidak memaksa tutup aplikasi saat sedang dipakai.
- Setelah terapkan, app restart dengan versi terbaru.

### 11. Penanganan Masalah

| Gejala | Solusi |
|---|---|
| Tidak bisa login | Periksa email/password; pastikan akun pengawas aktif di APIAMIS |
| Layar lokasi / GPS | Aktifkan GPS di pengaturan HP → izinkan lokasi **Selalu** untuk app ini |
| Gagal memuat detail offline | Buka pekerjaan sekali saat online; cache kedaluwarsa setelah 24 jam |
| Foto gagal upload | Periksa koneksi; foto antrean terkirim otomatis saat online |
| Koordinat kosong | Beri izin lokasi; coba **Lokasi perangkat** atau isi manual |
| Kamera tidak terbuka | Beri izin kamera; tutup app kamera lain yang sedang berjalan |
| Select terpotong | Tap field → pilih dari daftar di sheet bawah (bukan dropdown native) |

---

## Setup Pengembang

### Prasyarat

| Kebutuhan | Catatan |
|---|---|
| Bun 1.2+ | Dari root monorepo `pengawas` |
| Expo CLI / Expo Go | Untuk development |
| APIAMIS running | `http://apiamis.test/api` |

### Instalasi

```powershell
# Dari root monorepo
rtk bun install

# Salin environment
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/mobile/.env`:

```env
EXPO_PUBLIC_APIAMIS_BASE_URL=http://apiamis.test/api
EXPO_PUBLIC_OAUTH_CALLBACK_URL=pengawas://oauth-callback
```

**Device fisik:** ganti `apiamis.test` dengan **IP LAN PC** (mis. `http://192.168.1.10/api`) atau hostname yang bisa di-resolve HP.

### Menjalankan

```powershell
# Dari root
rtk bun run mobile

# Atau dari apps/mobile
rtk bun run start
```

| Perintah | Fungsi |
|---|---|
| `bun run start` | Expo dev server |
| `bun run android` | Buka di emulator/Android |
| `bun run web` | Preview di browser |
| `bun run typecheck` | Cek TypeScript |
| `bun run update:preview` | Publish OTA ke channel preview |
| `bun run update:production` | Publish OTA ke channel production |

### Struktur

```text
apps/mobile/
├── app/                    # Expo Router (tabs, login, pekerjaan/[id])
├── components/
│   ├── pekerjaan/          # Tab detail (Foto, Progress, ...)
│   └── ui/                 # NeoButton, NeoSelect, FormModal, ...
├── hooks/                  # Auth, GPS, OTA, antrean foto
├── lib/
│   ├── api.ts              # Client APIAMIS
│   ├── auth.tsx            # Sesi + offline cache
│   ├── query-persist.ts    # AsyncStorage cache React Query
│   └── device-location.ts  # Fallback GPS / seluler
└── scripts/publish-eas-update.ts
```

---

## Build & OTA

### APK lokal (VPS / Gradle)

```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh
```

### EAS Build

```bash
cd apps/mobile
bunx eas build --platform android --profile preview
```

### OTA Update (EAS)

```powershell
rtk bun run update:preview
# atau dengan pesan:
rtk bun run scripts/publish-eas-update.ts preview "Deskripsi perubahan"
```

Production: salin `apps/mobile/.env.production.example` → `.env.production` sebelum build.

---

## Dokumen Terkait

| Dokumen | Isi |
|---|---|
| [README monorepo](../../README.md) | Panel web + arsitektur keseluruhan |
| [USER_GUIDE.md](../../USER_GUIDE.md) | Panduan panel web `/pengawasan` |
| [Agents.md](../../Agents.md) | Panduan kontribusi untuk AI/developer |