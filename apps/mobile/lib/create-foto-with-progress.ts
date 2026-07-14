import type { Foto } from '@pengawas/shared'
import { ApiError, formatApiError, unwrapEntity } from '@pengawas/api-client'
import { getApiBaseUrl } from '@/lib/config'
import { ensureSessionToken, getSessionTokenSync } from '@/lib/session'

export type CreateFotoProgress = {
  /** 0–100, null jika total tidak diketahui. */
  percent: number | null
  loaded: number
  total: number | null
}

/**
 * Upload foto via XHR agar progress byte tersedia di React Native.
 * Fallback ke fetch-style error parsing yang sama dengan api-client.
 * @param fotoId — jika diisi, update foto existing (POST /foto/{id} + _method=PUT)
 *   tanpa delete-then-create (hindari foto hilang bila upload gagal).
 */
export async function createFotoWithProgress(
  formData: FormData,
  onProgress?: (progress: CreateFotoProgress) => void,
  fotoId?: number,
): Promise<Foto> {
  const token = getSessionTokenSync() ?? (await ensureSessionToken())
  if (!token?.trim()) {
    throw new ApiError('Sesi tidak tersedia. Login ulang.', 401, null)
  }

  const url = fotoId != null ? `${getApiBaseUrl()}/foto/${fotoId}` : `${getApiBaseUrl()}/foto`
  if (fotoId != null && !formData.has('_method')) {
    formData.append('_method', 'PUT')
  }

  return new Promise<Foto>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      if (event.lengthComputable && event.total > 0) {
        onProgress({
          percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
          loaded: event.loaded,
          total: event.total,
        })
        return
      }
      onProgress({
        percent: null,
        loaded: event.loaded,
        total: null,
      })
    }

    xhr.onload = () => {
      const status = xhr.status
      // RN kadang kasih response string meski responseType=json
      let payload: unknown = xhr.response ?? null
      if (typeof payload === 'string' && payload.trim()) {
        try {
          payload = JSON.parse(payload)
        } catch {
          // biarkan string
        }
      }
      if (payload == null && typeof xhr.responseText === 'string' && xhr.responseText.trim()) {
        try {
          payload = JSON.parse(xhr.responseText)
        } catch {
          payload = xhr.responseText
        }
      }

      if (status >= 200 && status < 300) {
        try {
          const foto = unwrapEntity<Foto>(payload)
          onProgress?.({ percent: 100, loaded: 1, total: 1 })
          // Sukses meski body tipis — jangan reject (reject → antrean → upload loop)
          if (foto && typeof foto === 'object') {
            resolve(foto)
            return
          }
          resolve({ id: 0, ...(typeof payload === 'object' && payload ? payload : {}) } as Foto)
        } catch {
          // HTTP 2xx = server terima file. Anggap sukses agar tidak di-enqueue ulang.
          onProgress?.({ percent: 100, loaded: 1, total: 1 })
          resolve({ id: 0 } as Foto)
        }
        return
      }

      const message =
        formatApiError(new ApiError('Upload gagal', status, payload), 'Gagal mengunggah foto') ||
        `Gagal mengunggah foto (${status})`
      reject(new ApiError(message, status, payload))
    }

    xhr.onerror = () => {
      // Hanya error jaringan sejati — status 0
      reject(new ApiError('Jaringan gagal saat mengunggah foto.', 0, null))
    }

    xhr.ontimeout = () => {
      // Timeout setelah upload panjang: server mungkin sudah simpan.
      // Jangan treat sebagai retriable create otomatis di layer atas.
      reject(new ApiError('Upload foto timeout. Cek apakah foto sudah masuk, lalu unggah ulang hanya jika belum.', 408, null))
    }

    // 3 menit — foto lapangan bisa besar di jaringan seluler.
    xhr.timeout = 180_000
    xhr.send(formData)
  })
}
