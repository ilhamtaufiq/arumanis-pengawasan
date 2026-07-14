import type { Foto } from '@pengawas/shared'
import { ApiError, formatApiError, unwrapEntity } from '@pengawas/api-client'
import { getApiBaseUrl } from '@/lib/config'
import { ensureSessionToken, getSessionTokenSync } from '@/lib/session'

export type CreateFotoProgress = {
  /** 0–100, null jika total tidak diketahui. */
  percent: number | null
  loaded: number
  total: number | null
  /** true = body sudah terkirim, menunggu JSON dari server (olah media). */
  waitingServer?: boolean
}

function parseResponsePayload(xhr: XMLHttpRequest): unknown {
  // Jangan andalkan responseType=json di React Native — sering null meski body ada.
  const text =
    typeof xhr.responseText === 'string' && xhr.responseText.length > 0
      ? xhr.responseText
      : typeof xhr.response === 'string'
        ? xhr.response
        : null

  if (text != null && text.trim()) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  if (xhr.response != null && typeof xhr.response === 'object') {
    return xhr.response
  }

  return null
}

function fotoFromPayload(payload: unknown): Foto {
  try {
    const foto = unwrapEntity<Foto>(payload)
    if (foto && typeof foto === 'object') {
      return foto
    }
  } catch {
    // ignore
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const data = record.data
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Foto
    }
    return payload as Foto
  }
  // Server 2xx tanpa body yang bisa di-parse — anggap sukses agar UI tidak stuck
  return { id: 0 } as Foto
}

/**
 * Upload foto via XHR agar progress byte tersedia di React Native.
 * Progress upload cap 99% sampai respons server diterima (hindari "100%" stuck
 * saat Spatie/media masih memproses di backend).
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
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    const xhr = new XMLHttpRequest()
    // text + parse manual — lebih andal di RN daripada responseType=json
    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.responseType = 'text'

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      if (event.lengthComputable && event.total > 0) {
        // Cap 99: 100% khusus saat response OK (hindari stuck "Mengunggah… 100%")
        const raw = Math.round((event.loaded / event.total) * 100)
        onProgress({
          percent: Math.min(99, raw),
          loaded: event.loaded,
          total: event.total,
          waitingServer: raw >= 100,
        })
        return
      }
      onProgress({
        percent: null,
        loaded: event.loaded,
        total: null,
      })
    }

    xhr.upload.onload = () => {
      // Body sudah terkirim — server mungkin masih proses media
      onProgress?.({
        percent: 99,
        loaded: 1,
        total: 1,
        waitingServer: true,
      })
    }

    const finishSuccess = (payload: unknown) => {
      const foto = fotoFromPayload(payload)
      onProgress?.({ percent: 100, loaded: 1, total: 1, waitingServer: false })
      settle(() => resolve(foto))
    }

    const finishError = (error: ApiError) => {
      settle(() => reject(error))
    }

    const handleDone = () => {
      if (settled) return
      const status = xhr.status

      // status 0 + readyState 4 bisa berarti abort/network; tapi kadang RN
      // melaporkan 0 padahal body ada — coba parse dulu
      let payload: unknown = null
      try {
        payload = parseResponsePayload(xhr)
      } catch {
        payload = null
      }

      if (status >= 200 && status < 300) {
        finishSuccess(payload)
        return
      }

      // Beberapa perangkat: status 0 tapi response JSON sukses (proxy/CDN)
      if (status === 0 && payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>
        if (record.data != null || record.id != null) {
          finishSuccess(payload)
          return
        }
      }

      if (status === 0) {
        finishError(new ApiError('Jaringan gagal saat mengunggah foto.', 0, payload))
        return
      }

      const message =
        formatApiError(new ApiError('Upload gagal', status, payload), 'Gagal mengunggah foto') ||
        `Gagal mengunggah foto (${status})`
      finishError(new ApiError(message, status, payload))
    }

    // onload kadang tidak fire di RN; readyState 4 lebih andal
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        handleDone()
      }
    }

    xhr.onload = () => {
      handleDone()
    }

    xhr.onerror = () => {
      if (settled) return
      // Coba anggap sukses jika ada body 2xx-like JSON
      try {
        const payload = parseResponsePayload(xhr)
        if (payload && typeof payload === 'object' && xhr.status >= 200 && xhr.status < 300) {
          finishSuccess(payload)
          return
        }
      } catch {
        // ignore
      }
      finishError(new ApiError('Jaringan gagal saat mengunggah foto.', 0, null))
    }

    xhr.ontimeout = () => {
      finishError(
        new ApiError(
          'Upload foto timeout. Cek daftar foto — bila sudah ada, jangan unggah ulang.',
          408,
          null,
        ),
      )
    }

    xhr.onabort = () => {
      finishError(new ApiError('Upload dibatalkan.', 0, null))
    }

    // 3 menit — foto lapangan bisa besar di jaringan seluler.
    xhr.timeout = 180_000
    xhr.send(formData)
  })
}
