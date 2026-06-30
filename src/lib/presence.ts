import { requestJson } from '@/lib/api'

export async function sendPresenceHeartbeat() {
  return requestJson<{ data: { ok: boolean; online_window_minutes: number } }>('/presence/heartbeat', {
    method: 'POST',
    body: { app: 'pengawasan' },
  })
}