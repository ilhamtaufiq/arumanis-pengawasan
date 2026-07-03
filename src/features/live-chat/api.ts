import { requestJson } from '@/lib/api'
import type { LiveChatMessage, LiveChatThread } from './types'

export async function getMyLiveChatThread() {
  return requestJson<{ success: boolean; data: LiveChatThread }>('/live-chat/thread')
}

export async function getLiveChatInbox() {
  return requestJson<{ success: boolean; data: LiveChatThread[] }>('/live-chat/inbox')
}

export async function getLiveChatMessages(threadId: number, afterId?: number) {
  const query = afterId ? `?after_id=${afterId}` : ''
  return requestJson<{ success: boolean; data: LiveChatMessage[] }>(
    `/live-chat/threads/${threadId}/messages${query}`,
  )
}

export async function sendLiveChatMessage(threadId: number, message: string) {
  return requestJson<{ success: boolean; data: LiveChatMessage }>(
    `/live-chat/threads/${threadId}/messages`,
    { method: 'POST', body: { message } },
  )
}

export async function closeLiveChatThread(threadId: number) {
  return requestJson<{ success: boolean; data: LiveChatThread }>(
    `/live-chat/threads/${threadId}/close`,
    { method: 'PATCH' },
  )
}