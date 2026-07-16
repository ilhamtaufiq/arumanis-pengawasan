# API Field Contract (Pengawas ↔ APIAMIS)

Mapping field kritis agar web + mobile tidak menebak nama kolom database.

Sumber kebenaran response: **Laravel JsonResource / controller** di `C:\laragon\www\apiamis`.  
Jangan mengasumsikan nama kolom DB (`n_kec`) sama dengan field API (`nama_kecamatan`).

Helper display (wajib untuk UI lokasi):

```ts
import {
  getKecamatanName,
  getDesaName,
  formatLokasiWilayah,
  formatPekerjaanLokasi,
} from '@pengawas/shared/wilayah-fields'
// atau: from '@pengawas/shared'
```

Implementasi: `packages/shared/src/wilayah-fields.ts`  
Test: `tests/wilayah-fields.test.ts`

---

## Aturan umum

1. Baca **Resource** di APIAMIS sebelum menambah type FE.
2. Type FE mencerminkan **shape API**, bukan schema SQL.
3. Query raw di backend memakai **nama kolom DB**.
4. Client membaca **alias API**; helper men-fallback ke nama DB jika payload campur.

---

## Wilayah

| DB table.column | API field (Resource) | FE type preferensi | Catatan |
|---|---|---|---|
| `tbl_kecamatan.n_kec` | `nama_kecamatan` | `Kecamatan.nama_kecamatan` | Alias di `KecamatanResource` |
| `tbl_desa.n_desa` | `nama_desa` | `Desa.nama_desa` | Alias di `DesaResource` |
| `tbl_desa.kecamatan_id` | `kecamatan_id` | sama | FK |

**Salah di client:** hardcode `pekerjaan.desa?.n_desa` saja  
**Benar:** `getDesaName(pekerjaan.desa)` / `formatPekerjaanLokasi(pekerjaan)`

Order default display pengawas: **kecamatan · desa** (bukan desa-kec).

Konsultan (`is_konsultan`): tanpa lokasi desa/kec — helper mengembalikan empty label.

---

## Pekerjaan (scope pengawas)

| Field tipikal | Catatan |
|---|---|
| `nama_paket`, `kode_rekening` | List + detail |
| `desa`, `kecamatan` | Nested resource; pakai helper |
| `is_konsultan` | Boolean; skip lokasi |
| `progress_total` / counts | Boleh computed; cek list vs detail |

Scope data: backend `byUserRole()` / assignment pengawas — filter FE **tidak** menggantikan otorisasi.

---

## Batas domain (jangan dibawa ke pengawas)

Fitur admin Arumanis **bukan** scope app ini kecuali diminta eksplisit:

- Data quality queue / action inbox admin
- SPSE promote-draft staging
- WhatsApp Baileys bridge admin
- OnlyOffice full document register admin

Pengawas fokus fokus pekerjaan yang diawas, foto, progress, penerima, tiket, notifikasi, laporan.

---

## Checklist perubahan kontrak

- [ ] Resource / controller APIAMIS diubah?
- [ ] Type di `packages/shared/src/types.ts` (atau local types) diselaraskan?
- [ ] Display lokasi lewat `@pengawas/shared/wilayah-fields`?
- [ ] `bun test tests/wilayah-fields.test.ts` + smoke list/detail web/mobile?
