# Arumanis Pengawasan

**Panel pengawas lapangan** untuk ekosistem **Arumanis** — aplikasi web ringan yang membantu pengawas memantau pekerjaan, mendokumentasikan progress, dan mengelola tiket dukungan di lapangan.

Aplikasi ini berjalan sebagai layanan terpisah di subpath `/pengawasan`, berpasangan dengan backend [**APIAMIS**](https://github.com/ilhamtaufiq/apiamis) (Laravel) dan terintegrasi dengan portal utama [**Arumanis**](https://github.com/ilhamtaufiq/arumanis).

| | |
|---|---|
| **Versi** | 1.0.0 |
| **Branch aktif** | `main` |
| **Runtime** | [Bun](https://bun.sh/) |
| **Base path** | `/pengawasan` |
| **Backend** | [apiamis](https://github.com/ilhamtaufiq/apiamis) |

---

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur Utama](#fitur-utama)
- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Persiapan Lingkungan](#persiapan-lingkungan)
- [Instalasi & Pengembangan](#instalasi--pengembangan)
- [Konfigurasi](#konfigurasi)
- [Struktur Proyek](#struktur-proyek)
- [Skrip Tersedia](#skrip-tersedia)
- [Aplikasi Mobile (Expo)](#aplikasi-mobile-expo)
- [Deployment](#deployment)
- [Dokumentasi Pengguna](#dokumentasi-pengguna)
- [Repositori Terkait](#repositori-terkait)

---

## Gambaran Umum

Arumanis Pengawasan dirancang sebagai **dashboard operasional** untuk pengawas lapangan — bukan portal administrasi penuh. Pengguna hanya melihat pekerjaan yang menjadi tanggung jawab akun mereka, sesuai aturan assignment dan role di backend.

**Peran aplikasi:**

| Tanggung jawab | Di aplikasi ini | Di APIAMIS |
|---|---|---|
| UI dashboard pengawas | Ya | Tidak |
| Auth proxy & sesi cookie | Ya (BFF) | Token & validasi |
| Business logic & RBAC | Tidak | Ya |
| Penyimpanan data | Tidak | Ya |

---

## Fitur Utama

### Dashboard & Pekerjaan
- Ringkasan KPI pengawas (lokasi, pagu, statistik pekerjaan)
- Daftar pekerjaan yang diawasi dengan filter dan pencarian
- Detail pekerjaan per tab: informasi umum, progress, foto, output, penerima

### Dokumentasi Lapangan
- Upload foto dengan ekstraksi koordinat GPS dari EXIF
- Validasi lokasi foto terhadap area proyek (geo-fencing via backend)
- Input dan pembaruan progress fisik pekerjaan

### Tiket & Profil
- Manajemen tiket dukungan teknis
- Halaman profil pengguna
- Panduan penggunaan aplikasi bawaan (`/panduan`)

### Autentikasi & Sesi
- Login manual (email/password via APIAMIS)
- Dukungan SSO/token dari portal Arumanis
- Sesi disimpan sebagai httpOnly cookie — token tidak disimpan di `localStorage`
- Mode impersonasi admin (banner peringatan saat aktif)

---

## Arsitektur

```text
┌─────────────────────────────────────────────────────────┐
│              Arumanis Pengawasan (Bun)                  │
│  ┌─────────────────┐       ┌─────────────────────────┐  │
│  │  React + Vite   │       │   Hono BFF (server/)    │  │
│  │  (UI dashboard) │ ────▶ │  auth proxy · API proxy │  │
│  └─────────────────┘       │  cookie · cache · CORS  │  │
│                            └────────────┬────────────┘  │
└─────────────────────────────────────────┼───────────────┘
                                          │ Bearer token
                                          ▼
                               ┌─────────────────────┐
                               │      APIAMIS        │
                               │   Laravel REST API  │
                               └─────────────────────┘
```

**Alur autentikasi:**

```text
Browser → POST /bff/auth/login → BFF → POST /api/auth/login (APIAMIS)
       ← httpOnly cookie      ← Bearer token disimpan di cookie server-side
Browser → GET /bff/...       → BFF → GET /api/... (dengan Bearer token)
```

Frontend tidak pernah menyimpan token secara langsung. Semua request ke APIAMIS dilalui Backend-for-Frontend (BFF) di `server/index.ts`.

---

## Tech Stack

| Kategori | Teknologi |
|---|---|
| Runtime & server | Bun, Hono |
| UI | React 18, TypeScript |
| Build | Vite 5 |
| Routing | React Router 6 |
| Server state | TanStack Query |
| Form | React Hook Form, Zod |
| Peta | Leaflet |
| OCR | Tesseract.js |
| Testing | Bun test |

---

## Persiapan Lingkungan

| Kebutuhan | Versi |
|---|---|
| [Bun](https://bun.sh/) | 1.2+ |
| Backend APIAMIS | Berjalan dan dapat diakses |
| Git | 2.x |

**Layout repositori lokal (disarankan):**

```text
C:\laragon\www\
  pengawas\   # panel pengawasan — repo ini
  apiamis\    # backend API
  bun\        # frontend Arumanis (admin)
```

---

## Instalasi & Pengembangan

```bash
# Clone repository
git clone https://github.com/ilhamtaufiq/arumanis-pengawasan.git
cd arumanis-pengawasan

# Install dependensi
bun install

# Salin konfigurasi environment
cp .env.example .env

# Jalankan development server (client + BFF)
bun run dev
```

Aplikasi tersedia di **http://localhost:3000** (development).

Pastikan backend APIAMIS sudah berjalan di `http://apiamis.test/api` atau sesuaikan `APIAMIS_BASE_URL` di `.env`.

---

## Konfigurasi

Buat file `.env` di root proyek:

```env
# Environment
BUN_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Backend API (wajib)
APIAMIS_BASE_URL=http://apiamis.test/api
API_TIMEOUT_MS=15000

# Sesi cookie
SESSION_COOKIE_NAME=pengawas_session
SESSION_COOKIE_SECURE=false
```

### Variabel production

| Variabel | Nilai production | Deskripsi |
|---|---|---|
| `APIAMIS_BASE_URL` | `https://apiamis.cianjur.space/api` | URL REST API backend |
| `APP_PUBLIC_BASE_PATH` | `/pengawasan` | Subpath deployment |
| `SESSION_COOKIE_PATH` | `/pengawasan` | Path cookie sesi |
| `SESSION_COOKIE_SECURE` | `true` | Wajib HTTPS di production |
| `BUN_ENV` | `production` | Mode runtime |

> **Catatan:** Jangan hardcode URL backend di source code. Selalu gunakan variabel environment.

---

## Struktur Proyek

```text
server/
└── index.ts              # Hono BFF — auth proxy, API proxy, static serve

src/
├── pages/                # Halaman route (Dashboard, Pekerjaan, Tiket, ...)
├── components/           # Komponen UI reusable
├── lib/
│   ├── api.ts            # Client API ke BFF
│   ├── format.ts         # Formatter rupiah, tanggal, persen
│   └── types.ts          # Type definitions
├── hooks/                # Custom React hooks
└── styles/               # Global CSS

scripts/
└── dev.ts                # Orchestrator dev server

tests/                    # Unit test (Bun test)
```

**Konvensi pengembangan:**

- Akses API → `src/lib/api.ts` (ke endpoint BFF, bukan langsung ke APIAMIS)
- Token & sesi → dikelola BFF via httpOnly cookie
- Validasi response penting → Zod di boundary API
- State server → TanStack Query dengan query key yang stabil

---

## Skrip Tersedia

| Perintah | Fungsi |
|---|---|
| `bun run dev` | Development server (client Vite + BFF Hono) |
| `bun run dev:client` | Hanya Vite dev server |
| `bun run dev:server` | Hanya BFF server (watch mode) |
| `bun run build` | Build production ke `dist/` |
| `bun run start` | Jalankan server production |
| `bun run preview` | Preview build production |
| `bun run typecheck` | Pengecekan tipe TypeScript |
| `bun test` | Unit test |
| `bun run mobile` | Expo dev server (`apps/mobile`) |
| `bun run mobile:web` | Mobile app di browser |
| `bun run mobile:typecheck` | Typecheck app mobile |
| `bun run mobile:build-android` | Build APK di VPS (Gradle lokal) |

---

## Aplikasi Mobile (Expo)

Aplikasi native **`apps/mobile`** untuk pengawas lapangan. Auth langsung ke APIAMIS (Bearer + SecureStore), tanpa BFF web.

### Prasyarat

| Kebutuhan | Catatan |
|---|---|
| Bun 1.2+ | Sama dengan monorepo root |
| Expo Go / emulator | Untuk development |
| APIAMIS dapat diakses | `http://apiamis.test/api` (dev) |

### Setup cepat

```bash
# Dari root monorepo
bun install

# Salin env mobile
cp apps/mobile/.env.example apps/mobile/.env

# Edit EXPO_PUBLIC_APIAMIS_BASE_URL dan Reverb (opsional)
# Jalankan
bun run mobile
```

**Device fisik:** gunakan IP LAN PC, bukan `localhost` / `apiamis.test`, kecuali DNS Laragon sudah diarahkan di jaringan yang sama.

### Environment (`apps/mobile/.env`)

```env
EXPO_PUBLIC_APIAMIS_BASE_URL=http://apiamis.test/api

# Reverb (kosongkan jika tidak dipakai)
EXPO_PUBLIC_REVERB_APP_KEY=
EXPO_PUBLIC_REVERB_HOST=apiamis.test
EXPO_PUBLIC_REVERB_PORT=8080
EXPO_PUBLIC_REVERB_SCHEME=http
```

Production: salin `apps/mobile/.env.production.example` → `.env.production` sebelum build APK.

### Build Android (VPS)

```bash
# Di VPS dengan Android SDK + JDK 17 + Bun
chmod +x scripts/build-android.sh
./scripts/build-android.sh
```

Script otomatis: `git pull` → bump versi → `expo prebuild` → `assembleRelease` → salin APK ke `dist/`.

### EAS Build (opsional)

Profil di `apps/mobile/eas.json` (`development`, `preview`, `production`). Contoh:

```bash
cd apps/mobile
bunx eas build --platform android --profile preview
```

### Struktur mobile

```text
apps/mobile/
├── app/                 # Expo Router (tabs, login, pekerjaan, notifikasi)
├── components/          # UI neobrutalism + tab pekerjaan
├── hooks/               # Query, realtime, antrean foto
├── lib/                 # API, auth, upload, presence
└── assets/arumanis.png  # Icon & splash
```

---

## Deployment

### Docker

```bash
docker build -t arumanis-pengawasan .
docker run -d -p 3000:3000 arumanis-pengawasan
```

Image production dikonfigurasi untuk:

- Base path `/pengawasan`
- Cookie secure (`SESSION_COOKIE_SECURE=true`)
- API backend `https://apiamis.cianjur.space/api`

### Reverse proxy

Aplikasi dirancang untuk di-mount di subpath `/pengawasan` di belakang reverse proxy (Nginx, Caddy, Coolify). Endpoint health check:

```text
GET /pengawasan/health
```

Response contoh:

```json
{
  "ok": true,
  "env": "production",
  "apiBase": "https://apiamis.cianjur.space/api",
  "now": "2026-06-24T00:00:00.000Z"
}
```

### Integrasi dengan Arumanis

Portal utama Arumanis mengarahkan pengawas ke aplikasi ini melalui `VITE_PENGAWAS_APP_BASE_URL=/pengawasan`. Login SSO dari Arumanis didukung via parameter token di URL callback.

---

## Dokumentasi Pengguna

| Dokumen | Isi |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | Panduan lengkap fitur, alur kerja, FAQ, dan referensi API |
| [TUTORIAL-PANDUAN.md](TUTORIAL-PANDUAN.md) | Tutorial visual langkah demi langkah |

---

## Repositori Terkait

| Repo | Peran |
|---|---|
| [arumanis-pengawasan](https://github.com/ilhamtaufiq/arumanis-pengawasan) | Panel pengawas lapangan (repo ini) |
| [apiamis](https://github.com/ilhamtaufiq/apiamis) | Backend Laravel REST API |
| [arumanis](https://github.com/ilhamtaufiq/arumanis) | Frontend administrasi & operasional |

Perubahan yang menyentuh kontrak API atau aturan akses pengawas harus dilakukan di APIAMIS terlebih dahulu, kemudian disesuaikan di aplikasi ini.