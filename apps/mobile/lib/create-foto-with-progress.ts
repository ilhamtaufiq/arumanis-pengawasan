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
 */
export async function createFotoWithProgress(
  formData: FormData,
  onProgress?: (progress: CreateFotoProgress) => void,
): Promise<Foto> {
  const token = getSessionTokenSync() ?? (await ensureSessionToken())
  if (!token?.trim()) {
    throw new ApiError('Sesi tidak tersedia. Login ulang.', 401, null)
  }

  const url = `${getApiBaseUrl()}/foto`

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
      const payload = xhr.response ?? null

      if (status >= 200 && status < 300) {
        try {
          const foto = unwrapEntity<Foto>(payload)
          onProgress?.({ percent: 100, loaded: 1, total: 1 })
          resolve(foto)
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Respons upload tidak valid'))
        }
        return
      }

      const message =
        formatApiError(new ApiError('Upload gagal', status, payload), 'Gagal mengunggah foto') ||
        `Gagal mengunggah foto (${status})`
      reject(new ApiError(message, status, payload))
    }

    xhr.onerror = () => {
      reject(new ApiError('Jaringan gagal saat mengunggah foto.', 0, null))
    }

    xhr.ontimeout = () => {
      reject(new ApiError('Upload foto timeout. Coba lagi.', 0, null))
    }

    // 3 menit — foto lapangan bisa besar di jaringan seluler.
    xhr.timeout = 180_000
    xhr.send(formData)
  })
}
