export type LocalNotificationPayload = {
  title: string
  body: string
  url?: string
}

export function parseBroadcastNotificationPayload(payload: unknown): LocalNotificationPayload | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const body = typeof record.message === 'string' ? record.message.trim() : ''
  const url = typeof record.url === 'string' ? record.url : undefined

  if (!title && !body) return null

  return {
    title: title || 'Notifikasi Pengawas',
    body: body || 'Ada pembaruan baru untuk akun Anda.',
    url,
  }
}