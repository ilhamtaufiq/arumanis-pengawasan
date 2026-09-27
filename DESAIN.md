# Desain Dashboard Pengawas (Neubrutalism)

Panduan desain ini menggabungkan tema Neubrutalism / Bold-Retro UI dengan kebutuhan spesifik Dashboard Pengawas. Gunakan dokumen ini sebagai acuan utama bagi agent/desainer saat membangun atau mereplikasi tampilan.

---

## 1. Gaya Visual Utama

**Neubrutalism / Bold-Retro UI**
- Border **hitam pekat (#000000)**, tebal **2px**, di hampir semua elemen (card, button, input, avatar).
- **Hard shadow** (bukan soft blur): offset shadow solid berwarna hitam/gelap, contoh `box-shadow: 4px 4px 0px #000000;` — bukan `box-shadow: 0 4px 10px rgba(0,0,0,0.1)`.
- Sudut **rounded** sedang (radius 8px - 16px) dikombinasikan dengan border tegas — kesan playful tapi terstruktur.
- Latar belakang halaman **abu-abu terang (#F2F2F2 / #EFEFEF)**, agar card putih & berwarna menonjol (kontras tinggi).
- Elemen terasa "menempel" satu sama lain seperti stiker/kartu fisik, bukan flat minimalis biasa.
- Animasi ringan dan langsung, bukan halus berlebihan.

**Jangan gunakan:**
- Glassmorphism.
- Shadow blur lembut sebagai gaya utama.
- Gradient dekoratif besar.
- Card bertumpuk di dalam card (kecuali untuk efek khusus seperti saldo/statistik utama).

---

## 2. Token Visual & Palet Warna

```css
:root {
  --background: #F2F2F2;
  --foreground: #000000;
  --main: #FFCF4D;
  --main-foreground: #000000;
  --secondary: #FF9466;
  --secondary-foreground: #000000;
  --accent: #3ECF8E;
  --accent-foreground: #000000;
  --info: #6C6CE5;
  --info-foreground: #000000;
  --danger: #F9B4B4;
  --danger-foreground: #000000;
  --warning: #FBEFD1;
  --warning-foreground: #000000;
  --success: #DFF5E3;
  --success-foreground: #000000;
  --muted: #EFEFEF;
  --muted-foreground: #8A8A8A;
  --border: #000000;
  --ring: #000000;
  --card: #ffffff;
  --card-foreground: #000000;
  
  --border-width: 2px;
  --shadow: 4px 4px 0 #000000;
  --shadow-sm: 2px 2px 0 #000000;
  --shadow-lg: 6px 6px 0 #000000;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --space: 24px;
}
```

**Aturan kontras:** 
Setiap warna solid (kuning, oranye, biru, hijau) **selalu dipasangkan dengan teks/ikon hitam** di atasnya, bukan putih — ini ciri khas gaya neubrutalism.

---

## 3. Tipografi

- Font: **Sans-serif geometris/rounded** (mis. `Inter`, `Plus Jakarta Sans`, atau `Poppins`).
- Judul/nama besar: **Bold, ukuran besar (24–32px)**.
- Label & subteks: **regular/medium, ukuran kecil (12–14px), warna abu (`--muted-foreground`)**.
- Angka KPI / Finansial selalu ditonjolkan dengan **bold (weight 800/900) + ukuran lebih besar (28-40px)** dari label di sekitarnya.
- Letter spacing `0`.

---

## 4. Komponen

### 4.1 Button & Interaksi
- Gaya dasar: `border: 2px solid var(--border);`, `box-shadow: var(--shadow-sm);`, `border-radius: var(--radius-sm);`.
- State Aktif/Hover: `transform: translate(4px, 4px);`, `box-shadow: none;`.
- Teks di atas tombol solid selalu **hitam**.
- Baris tabel / menu aktif ditandai dengan **fill kuning penuh (`--main`)**.

### 4.2 Card (Panel, KPI, dll)
- Gunakan `box-shadow: var(--shadow);` dan `border-radius: var(--radius);`.
- Background putih `#FFFFFF` untuk panel standar.
- Boleh gunakan efek "kartu di atas kartu" (layered cards) berwarna solid untuk menonjolkan ringkasan penting.
- Header card padat: title, subtitle pendek, optional action.

### 4.3 Tabel Data
- Header kolom: teks abu kecil (`--muted-foreground`), dengan border bawah.
- Border antar row tegas.
- **Baris terpilih** (selected) mendapat **highlight background kuning penuh (`--main`)**.
- Kolom status memakai badge.

### 4.4 Badge Status (Pill)
Bentuk pill (radius besar) dengan warna pastel lembut:
- **Pending/Menunggu** `--warning` (krem/kuning pucat)
- **Rejected/Gagal/Terlambat** `--danger` (merah muda)
- **Completed/Selesai** `--success` (hijau muda)
- Teks pada badge harus kontras (hitam/gelap).

### 4.5 Form & Input
- Input, select, textarea memakai border hitam 2px.
- Focus state: outline/ring tegas (bukan soft glow).
- Label selalu terlihat.

---

## 5. Layout & Spacing

- Sidebar (Navigasi): `260px` di desktop, bisa collapse/drawer di mobile.
- Gap antar kartu KPI: `16px` - `24px`.
- Semua card sejajar secara vertikal (top-aligned), memberi kesan grid modular.
- Di mobile, tabel berubah menjadi horizontal scroll atau card list ringkas.

---

## 6. Checklist Implementasi Cepat

- [ ] Semua card, button, input pakai border `2px solid #000`
- [ ] Shadow pakai offset solid, bukan blur (`4px 4px 0 #000`)
- [ ] Radius konsisten `8px` untuk elemen kecil, `12px - 16px` untuk kontainer besar
- [ ] Latar belakang halaman abu-abu terang (`#F2F2F2`)
- [ ] Teks di atas warna aksen solid selalu **hitam**, bukan putih
- [ ] Baris tabel/tab/menu aktif selalu ditandai dengan **fill kuning penuh**
- [ ] Badge status pakai warna pastel lembut (bukan warna solid tegas)
- [ ] Interaksi klik (active) menggeser elemen searah shadow (translate x,y) dan menghilangkan shadow
