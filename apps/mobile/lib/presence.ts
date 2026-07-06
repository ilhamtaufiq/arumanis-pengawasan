import { sendPresenceHeartbeat as sendPresenceHeartbeatRequest } from '@/lib/api'
import { getApiBaseUrl } from '@/lib/config'
import { ensureSessionToken } from '@/lib/session'

export const PRESENCE_APP = 'pengawasan' as const

export async function sendPresenceHeartbeat(koordinat?: string) {
  const trimmed = koordinat?.trim()
  return sendPresenceHeartbeatRequest(PRESENCE_APP, trimmed ? { koordinat: trimmed } : undefined)
}

/** Dipanggil dari background task — tanpa React context. */
export async function sendPresenceHeartbeatFromTask(koordinat: string) {
  const token = await ensureSessionToken()
  if (!token?.trim()) {
    return
  }

  const response = await fetch(`${getApiBaseUrl()}/presence/heartbeat`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      app: PRESENCE_APP,
      koordinat: koordinat.trim(),
    }),
  })

  if (response.status === 401) {
    // Sesi habis; pelacakan akan dihentikan saat app dibuka lagi.
    return
  }
}