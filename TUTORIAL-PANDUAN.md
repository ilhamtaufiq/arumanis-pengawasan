# Panduan Pengawas Arumanis

Panduan untuk pengawas lapangan menggunakan panel pengawasan Arumanis.

---

## 1. Login

**URL:** `http://localhost:5173/pengawasan/login`

1. Buka URL di browser
2. Masukkan email: `bidangams@gmail.com`
3. Masukkan password: `Cianjur22!`
4. Klik **Masuk**

Setelah login, Anda masuk ke **Dashboard Pengawasan**.

---

## 2. Dashboard Pengawasan

**Ringkasan** paket pekerjaan yang diawasi:

- **Jumlah Paket Pekerjaan** — total paket
- **Belum Isi Progress** — paket yang belum diisi progress
- **Paket Deviasi** — ada selisih rencana dan realisasi
- **Foto Belum Lengkap** — paket dengan foto kurang

**Navigasi samping:**
- Dashboard
- Pekerjaan
- Tiket
- Panduan
- Profil

---

## 3. Halaman Detail Pekerjaan

Klik nama paket di dashboard/pekerjaan → `/pekerjaan/{id}`

### Tab yang tersedia:

| Tab | Fungsi |
|-----|--------|
| **Ringkasan** | Info utama, kontrak, jumlah foto/penerima/output |
| **Output** | Tambah/edit/hapus komponen output |
| **Penerima** | Tambah/edit/hapus penerima manfaat |
| **Foto** | Upload foto per output per slot (0%-100%) |
| **Progress** | Isi rencana dan realisasi per minggu |
| **Tiket** | Buat dan pantau tiket isu lapangan |

---

## 4. Tab Output (Fitur Baru)

### Form Tambah Output
Form selalu terbuka (tanpa toggle).

**Dropdown Komponen** (11 pilihan):
- Sambungan Rumah
- MCK
- MCK Individu
- MCK Komunal
- Pipa
- Broncaptering
- Reservoir
- Tangki Septik Individu
- Tangki Septik Komunal
- Sumur Bor
- Pompa

**Dropdown Satuan** (4 pilihan):
- Unit
- Meter
- Meter Persegi
- Meter Kubik

**Checkbox Komponen Komunal** — centang jika output bersifat komunal.

**Cara pakai:**
1. Pilih komponen dari dropdown
2. Pilih satuan
3. Isi volume
4. Centang "Komponen Komunal" jika perlu
5. Klik **Tambah Output**

### Edit Output
- Klik tombol **Edit** pada baris output
- Form terisi data lama
- Ubah field, klik **Simpan perubahan**

### Hapus Output
- Klik tombol **Hapus**
- Konfirmasi dialog muncul
- Klik **Hapus** untuk konfirmasi

---

## 5. Fitur Lainnya

### Penerima
- Tambah/edit/hapus penerima
- Mode **Komunal** untuk penerima kelompok
- Field: Nama, Jumlah Jiwa, NIK, Alamat

### Foto
- Matriks foto per output
- Slot: 0%, 25%, 50%, 75%, 100%
- Upload dengan koordinat GPS (manual atau ekstrak dari foto)
- Cetak foto ke PDF

### Progress
- Pilih minggu aktif
- Isi kolom Rencana dan Realisasi
- Klik **Simpan**

### Tiket
- Buat tiket untuk isu lapangan
- Filter status dan prioritas

---

## 6. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Form tidak muncul | Pastikan tab Output aktif |
| Dropdown kosong | Browser refresh |
| Data tidak tersimpan | Cek koneksi, coba simpan ulang |
| Login gagal | Verifikasi email & password |

---

## 7. Referensi API Output

| Fungsi | Method | Endpoint |
|--------|--------|----------|
| createOutput | POST | `/output` |
| updateOutput | PUT | `/output/{id}` |
| deleteOutput | DELETE | `/output/{id}` |

Tipe `Output`:
- `id`, `pekerjaan_id`, `komponen`, `satuan`, `volume`, `penerima_is_optional`, `created_at`, `updated_at`

---
