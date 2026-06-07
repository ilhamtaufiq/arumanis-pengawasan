# Desain Dashboard Pengawas

Tema utama: Neobrutalism.

Referensi:

- https://www.neobrutalism.dev/docs
- https://www.neobrutalism.dev/styling
- https://www.neobrutalism.dev/docs/installation

## Prinsip

Dashboard ini adalah alat kerja pengawas, bukan landing page. Tema neobrutalism dipakai untuk memberi kontras kuat, affordance jelas, dan hierarki visual yang mudah dipindai. Bentuk boleh ekspresif, tetapi informasi operasional tetap harus padat, rapi, dan cepat dibaca.

Gunakan karakter neobrutalism berikut:

- Border hitam tebal.
- Shadow keras tanpa blur.
- Warna aksen berani.
- Typography tegas dan modern.
- Komponen terasa "fisik": tombol, card, input, tab, dan tabel punya garis dan bayangan yang jelas.
- Animasi ringan dan langsung, bukan halus berlebihan.

Jangan gunakan:

- Glassmorphism.
- Shadow blur lembut sebagai gaya utama.
- Gradient dekoratif besar.
- Card bertumpuk di dalam card.
- Palet gelap biru/slate sebagai warna dominan.
- Radius besar seperti pill untuk container utama.

## Token Visual

### Warna

Palet dasar:

```css
:root {
  --background: #fff7e6;
  --foreground: #111111;
  --main: #ffcc00;
  --main-foreground: #111111;
  --secondary: #ff6b6b;
  --secondary-foreground: #111111;
  --accent: #4ade80;
  --accent-foreground: #111111;
  --info: #38bdf8;
  --info-foreground: #111111;
  --danger: #ff3b30;
  --danger-foreground: #ffffff;
  --muted: #f4f4f5;
  --muted-foreground: #3f3f46;
  --border: #111111;
  --ring: #111111;
  --card: #ffffff;
  --card-foreground: #111111;
}
```

Pemakaian warna:

- `--background`: latar halaman.
- `--card`: permukaan panel, tabel, dan form.
- `--main`: aksi utama dan highlight KPI.
- `--secondary`: warning, tugas menunggu, atau item perlu perhatian.
- `--accent`: sukses, progress aman, dan status selesai.
- `--info`: informasi netral seperti lokasi, filter, dan data pendukung.
- `--danger`: gagal, terlambat, error, tiket kritis.

Aturan kontras:

- Teks utama selalu `--foreground`.
- Hindari teks abu-abu kecil di atas warna aksen.
- Untuk badge berwarna terang, gunakan teks hitam.
- Untuk `--danger`, boleh gunakan teks putih bila kontras lebih baik.

### Border, Shadow, Radius

```css
:root {
  --border-width: 2px;
  --shadow-x: 4px;
  --shadow-y: 4px;
  --shadow: 4px 4px 0 #111111;
  --shadow-sm: 2px 2px 0 #111111;
  --shadow-lg: 6px 6px 0 #111111;
  --radius: 6px;
}
```

Aturan:

- Semua komponen interaktif memakai border `2px solid var(--border)`.
- Card KPI dan panel utama memakai `box-shadow: var(--shadow)`.
- Tombol utama memakai `box-shadow: var(--shadow-sm)` dan bergeser saat aktif.
- Radius default `6px`; maksimum `8px` untuk card dan modal.
- Jangan memakai shadow blur untuk permukaan utama.

### Typography

Rekomendasi:

- Heading: `Plus Jakarta Sans`, `Inter`, atau system sans.
- Body: `Inter`, `Plus Jakarta Sans`, atau system sans.
- Angka KPI boleh memakai font yang sama dengan `font-weight: 800`.

Skala:

```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

Aturan:

- H1 dashboard: 24-30px, bold.
- Judul card: 16-18px, bold.
- Label: 12-14px, medium/bold.
- Nilai KPI: 28-40px, bold.
- Body tabel: 14px.
- Letter spacing `0`.

## Layout

Desktop:

- Sidebar kiri 260px.
- Header atas 64px.
- Konten utama `max-width: none`, full dashboard width.
- Padding halaman 24px.
- Grid KPI 4 kolom.
- Area grafik 2 kolom.
- Tabel full width.

Tablet:

- Sidebar dapat collapse.
- Grid KPI 2 kolom.
- Grafik stack bila lebar tidak cukup.

Mobile:

- Sidebar berubah menjadi drawer.
- Header sticky.
- Grid KPI 1 kolom.
- Tabel berubah menjadi horizontal scroll atau card list ringkas.
- Filter masuk ke sheet/drawer.

Spacing:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

Gunakan gap dashboard:

- Antarkartu KPI: 16px.
- Antarsection: 24px.
- Padding card: 16px atau 20px.
- Padding cell tabel: 12px 14px.

## Komponen

### Button

Gaya dasar:

```css
.btn {
  border: 2px solid var(--border);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius);
  font-weight: 700;
  background: var(--main);
  color: var(--main-foreground);
}

.btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
```

Varian:

- `primary`: background `--main`.
- `secondary`: background `--secondary`.
- `neutral`: background `--card`.
- `success`: background `--accent`.
- `danger`: background `--danger`, teks putih.
- `ghost`: tanpa shadow, tetap punya border saat hover/focus.

Aturan:

- Aksi utama halaman hanya satu.
- Tombol icon-only wajib punya tooltip atau `aria-label`.
- Disabled tetap terlihat sebagai tombol, opacity maksimal `0.6`.

### Card

Gunakan untuk:

- KPI.
- Panel grafik.
- Form login.
- Detail pekerjaan.
- Empty/error state.

Aturan:

- Card tidak boleh nested.
- Card repeated item boleh, tetapi jangan membuat semua section menjadi floating card.
- Header card padat: title, subtitle pendek, optional action.
- KPI card boleh memakai warna latar aksen berbeda.

### Table

Tabel adalah komponen utama untuk pekerjaan, tiket, pengawas, dan daftar dokumen.

Aturan:

- Header tabel background `--main` atau `--muted`.
- Border antar row tetap jelas.
- Hover row boleh background `#fff1a8`.
- Kolom angka rata kanan.
- Kolom status memakai badge.
- Tabel harus punya loading, empty, error, pagination, dan filter state.
- Untuk mobile, prioritaskan scroll horizontal bila kolom penting banyak.

### Badge

Status:

- `Selesai`: hijau `--accent`.
- `Proses`: biru `--info`.
- `Menunggu`: kuning `--main`.
- `Perhatian`: merah muda/merah `--secondary`.
- `Terlambat` atau `Error`: `--danger`.

Badge memakai:

- Border hitam 2px.
- Radius 999px hanya untuk badge kecil.
- Font 12px bold.

### Form

Aturan:

- Input, select, textarea memakai border hitam 2px dan shadow kecil saat fokus.
- Label selalu terlihat.
- Error message di bawah field, warna `--danger`.
- Field wajib diberi tanda teks, bukan hanya warna.
- Form dashboard sebaiknya 1 kolom kecuali layar lebar.

### Navigation

Sidebar:

- Background `--card`.
- Border kanan 2px hitam.
- Active item background `--main`, border hitam, shadow kecil.
- Item navigasi berisi icon + label.

Header:

- Background `--background`.
- Border bawah 2px hitam.
- Berisi judul halaman, filter tahun/global, dan user menu.

### Chart

Chart harus mengikuti gaya neobrutalism:

- Container card border hitam dan shadow keras.
- Axis/tick warna hitam.
- Legend jelas dan ringkas.
- Warna bar/line dari token palet.
- Tooltip chart memakai border hitam dan shadow.

Warna chart:

```css
--chart-1: #ffcc00;
--chart-2: #ff6b6b;
--chart-3: #4ade80;
--chart-4: #38bdf8;
--chart-5: #a78bfa;
```

Jangan hanya mengandalkan warna untuk membedakan status; tambahkan label atau pattern bila perlu.

### Progress

Progress bar:

- Track putih atau `--muted`.
- Border hitam 2px.
- Fill sesuai status.
- Label persentase terlihat.

Status progress:

- `>= 80%`: hijau.
- `50-79%`: biru atau kuning.
- `< 50%`: kuning atau merah bila melewati target.
- Terlambat: merah dan label `Terlambat`.

## Pola Halaman

### Login

- Form login berada di card sederhana.
- Background halaman memakai `--background`.
- Judul: `Dashboard Pengawas`.
- Tidak perlu hero marketing.
- Error credential tampil di atas form.

### Dashboard

Urutan viewport pertama:

1. Header halaman dengan judul dan filter tahun.
2. KPI cards: total pekerjaan, total lokasi, total pagu, rata-rata progress/tiket terbuka.
3. Row kedua: grafik progress dan pekerjaan perlu perhatian.
4. Tabel pekerjaan prioritas.

### Detail Pekerjaan

Urutan:

1. Header paket, lokasi, status progress.
2. Ringkasan pagu, kegiatan, pengawas, pendamping.
3. Progress dan checklist.
4. Tiket dan catatan.
5. Media dan berkas.

### Tiket

Urutan:

1. Summary tiket terbuka/proses/selesai.
2. Filter status, prioritas, kecamatan, pencarian.
3. Tabel tiket.
4. Drawer/detail untuk komentar.

## State

Loading:

- Gunakan skeleton blok dengan border hitam.
- Jangan hanya spinner di halaman penuh.

Empty:

- Tampilkan pesan singkat dan action relevan.
- Empty state tetap memakai card bordered.

Error:

- Gunakan panel background `--secondary` atau `--danger`.
- Tampilkan kode status bila tersedia.
- Sediakan tombol retry.

Success:

- Toast atau inline alert dengan background `--accent`.

Unauthorized:

- Redirect ke login.

Forbidden:

- Tampilkan halaman/panel `Akses tidak diizinkan`.

## Accessibility

- Semua komponen interaktif harus dapat difokuskan dengan keyboard.
- Focus ring: outline hitam 2px plus offset 2px.
- Jangan hilangkan outline.
- Icon-only button wajib `aria-label`.
- Chart harus punya summary teks.
- Form error harus terhubung dengan field lewat `aria-describedby`.
- Kontras teks wajib tinggi, terutama di badge dan tombol.

## Implementasi Tailwind

Gunakan CSS variables sebagai sumber token. Contoh utility:

```tsx
<div className="rounded-[6px] border-2 border-black bg-white shadow-[4px_4px_0_#111]">
  ...
</div>
```

Helper class yang disarankan:

```css
.neo-surface {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  box-shadow: var(--shadow);
}

.neo-interactive {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.neo-interactive:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
```

Jika memakai shadcn/neobrutalism components:

- Inisialisasi shadcn terlebih dahulu.
- Gunakan komponen CSS variables, bukan utility-only legacy.
- Ambil komponen yang benar-benar dipakai: button, card, input, label, table, badge, dialog/sheet, select, tabs, tooltip, progress, skeleton, toast.
- Sesuaikan path komponen ke struktur project, misalnya `src/components/ui`.

## Checklist Review UI

Sebelum menyelesaikan fitur UI:

- KPI terlihat di viewport pertama desktop.
- Mobile tidak overlap dan tidak clipping.
- Semua tabel punya loading, empty, error, dan pagination/filter.
- Semua warna status konsisten.
- Semua tombol punya affordance border dan shadow.
- Tidak ada nested card.
- Tidak ada token atau data sensitif tampil di UI.
- Fokus keyboard terlihat.
- Screenshot desktop dan mobile sudah dicek untuk perubahan layout besar.
