# Improvement Backlog - Dashboard Pengawas

**Tanggal update:** 2026-06-23

**Tujuan keseluruhan**: Meningkatkan keandalan untuk penggunaan lapangan (pengawas), konsistensi desain neobrutalism, performa, dan pengalaman operasional sehari-hari.

### High Priority (Dampak Langsung ke Lapangan)

- **Image compression & optimization sebelum upload**
  - Resize otomatis + kompresi (misal max 1920px atau 1.5MB) di client sebelum POST `/foto`.
  - Gunakan `canvas` atau library ringan seperti `browser-image-compression`.
  - Alasan: Foto lapangan sering 5-10MB → lambat + boros kuota.

- **PWA + Offline Draft**
  - Jadikan aplikasi PWA (manifest + service worker dasar).
  - Simpan draft form (Penerima, Output, Progress, Foto upload) di IndexedDB/localStorage.
  - Queue upload foto saat online kembali.
  - Alasan: Pengawas sering kerja di lokasi sinyal buruk.

- **Perbaikan Photo Workflow (matriks + preview)**
  - Dukungan multiple foto per slot dengan navigasi next/prev yang solid di preview.
  - Tampilkan badge jumlah foto per slot di matriks.
  - Perbaiki UX "Ganti foto" dan hapus massal.
  - Alasan: Saat ini satu slot bisa punya beberapa foto tapi navigasi & visibilitas masih lemah.

- **Enforce Neobrutalism Design System**
  - Audit semua halaman: hilangkan inline style yang tidak konsisten.
  - Buat komponen resmi: `NeoSurface`, `PhotoMatrix`, `FieldGroup`, `StatusChip`.
  - Pastikan semua card, button, table, dan tab mengikuti token (border 2px, shadow keras, radius 6px).
  - Alasan: Konsistensi visual sangat penting untuk dashboard operasional.

- **Auto-save / Draft Persistence**
  - Simpan input user otomatis setiap beberapa detik.
  - Restore draft saat buka kembali halaman yang sama.

### Medium Priority

- **Virtualisasi & Performa Daftar Foto**
  - Gunakan `react-window` atau `virtuoso` untuk list foto yang panjang.
  - Lazy load thumbnail + progressive enhancement.

- **Bulk Actions**
  - Bulk upload foto + assign ke slot.
  - Bulk edit/hapus di penerima dan progress.
  - Bulk close/update tiket (sudah ada endpoint, perlu UI).

- **Form Quality**
  - Pindah semua form ke React Hook Form + Zod.
  - Tambah real-time validation + error message yang jelas.
  - Field-level help text yang konsisten.

- **Mobile / Field Experience**
  - Optimasi layout untuk layar kecil (bottom sheet untuk action, swipe gesture di preview).
  - Touch-friendly button (min 44px).
  - Direct camera capture (bukan hanya file picker).

- **Koordinat & OCR Enhancement**
  - Tingkatkan akurasi Tesseract (preprocessing lebih baik, crop watermark area, multiple attempts).
  - Fallback ke browser geolocation + manual input dengan smart suggestion.
  - Validasi koordinat di client (range Indonesia).

- **Better State & Error Handling**
  - Optimistic update di lebih banyak tempat (progress, penerima).
  - Global error boundary + user-friendly error messages.
  - Retry button di query error.

### Low Priority / Nice to Have

- **Advanced Reporting**
  - Export Excel/PDF per pekerjaan atau per periode.
  - Dashboard ringkasan tambahan (trend deviasi, foto completion rate).

- **Notification & Alert**
  - Notifikasi tiket baru atau progress yang jauh dari target (polling dulu, nanti bisa pakai push).

- **Developer Experience**
  - Storybook atau katalog komponen.
  - Lebih banyak unit test untuk util (format, parser koordinat, OCR helper).
  - E2E test kritis dengan Playwright (upload foto end-to-end).

- **Observability**
  - Client-side error logging (misal Sentry atau custom).
  - Performance monitoring untuk upload foto.

- **Internationalization / Localization**
  - Saat ini sudah mostly ID, tapi pastikan semua string terpusat.

### Catatan Tambahan

- Semua improvement harus tetap mengikuti prinsip DESAIN.md (neobrutalism, padat, mudah dipindai, tidak ada glassmorphism).
- Prioritaskan yang langsung membantu pengawas di lapangan (foto, koordinat, offline, kecepatan).
- Koordinasi dengan backend `apiamis` jika diperlukan endpoint baru (contoh agregasi ringkasan).
- Setelah setiap sprint improvement, lakukan audit singkat terhadap checklist di `DESAIN.md`.

**Update terakhir**: 2026-06-23

**Owner**: Tim pengembangan pengawas dashboard
