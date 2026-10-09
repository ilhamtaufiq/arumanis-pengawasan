/**
 * Konfigurasi build-time untuk frontend.
 *
 * APIAMIS dipanggil langsung dari browser (tanpa BFF). Cookie sesi `arumanis_token`
 * di-set oleh APIAMIS sendiri (httpOnly), jadi frontend tidak menyimpan token apa pun.
 */
const rawApiamisBaseUrl = (import.meta.env.VITE_APIAMIS_BASE_URL ?? '').trim()

/** Base URL APIAMIS tanpa slash di akhir, mis. https://apiamis.cianjur.space/api */
export const APIAMIS_BASE_URL = rawApiamisBaseUrl.replace(/\/+$/, '')

if (!APIAMIS_BASE_URL) {
  console.error('[pengawas config] VITE_APIAMIS_BASE_URL belum di-set; request API tidak akan berhasil.')
}
