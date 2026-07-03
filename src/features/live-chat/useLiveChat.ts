import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@/lib/types'
import {
  closeLiveChatThread,
  getLiveChatInbox,
  getLiveChatMessages,
  getMyLiveChatThread,
  sendLiveChatMessage,
} from './api'
import type { LiveChatMessage, LiveChatThread } from './types'

const POLL_INTERVAL_MS = 5_000

function normalizeRoles(user?: AuthUser | null) {
  return (user?.roles ?? [])
    .map((role) => (typeof role === 'string' ? role : role.name))
    .filter(Boolean)
}

export function useLiveChat(user: AuthUser | null | undefined, enabled = true) {
  const queryClient = useQueryClient()
  const roles = useMemo(() => normalizeRoles(user), [user])
  const isAdmin = roles.includes('admin')
  const currentUserId = user?.id

  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef(0)

  const myThreadQuery = useQuery({
    queryKey: ['live-chat', 'thread'],
    queryFn: getMyLiveChatThread,
    enabled: enabled && Boolean(user) && !isAdmin,
    staleTime: 30_000,
  })

  const inboxQuery = useQuery({
    queryKey: ['live-chat', 'inbox'],
    queryFn: getLiveChatInbox,
    enabled: enabled && Boolean(user) && isAdmin,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    staleTime: 5_000,
  })

  const activeThread = useMemo(() => {
    if (isAdmin) {
      const inbox = inboxQuery.data?.data ?? []
      return inbox.find((thread) => thread.id === activeThreadId) ?? null
    }
    return myThreadQuery.data?.data ?? null
  }, [activeThreadId, inboxQuery.data?.data, isAdmin, myThreadQuery.data?.data])

  const resolvedThreadId = isAdmin ? activeThreadId : activeThread?.id ?? null

  const loadMessages = useCallback(async (threadId: number, reset = false) => {
    const afterId = reset ? 0 : lastMessageIdRef.current
    const response = await getLiveChatMessages(threadId, afterId > 0 ? afterId : undefined)

    if (reset) {
      setMessages(response.data)
    } else if (response.data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((item) => item.id))
        const merged = [...prev]
        for (const item of response.data) {
          if (!existingIds.has(item.id)) merged.push(item)
        }
        return merged.sort((a, b) => a.id - b.id)
      })
    }

    if (response.data.length > 0) {
      lastMessageIdRef.current = Math.max(
        lastMessageIdRef.current,
        ...response.data.map((item) => item.id),
      )
    }
  }, [])

  useEffect(() => {
    if (!enabled || !resolvedThreadId) return
    lastMessageIdRef.current = 0
    void loadMessages(resolvedThreadId, true)
  }, [enabled, loadMessages, resolvedThreadId])

  useEffect(() => {
    if (!enabled || !resolvedThreadId) return

    const timer = window.setInterval(() => {
      void loadMessages(resolvedThreadId)
      if (isAdmin) {
        void queryClient.invalidateQueries({ queryKey: ['live-chat', 'inbox'] })
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [enabled, isAdmin, loadMessages, queryClient, resolvedThreadId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isSending])

  useEffect(() => {
    if (!isAdmin && myThreadQuery.data?.data?.id) {
      setActiveThreadId(myThreadQuery.data.data.id)
    }
  }, [isAdmin, myThreadQuery.data?.data?.id])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !resolvedThreadId || isSending) return

    const outgoing = input.trim()
    setInput('')
    setIsSending(true)

    try {
      const response = await sendLiveChatMessage(resolvedThreadId, outgoing)
      setMessages((prev) => {
        if (prev.some((item) => item.id === response.data.id)) return prev
        return [...prev, response.data]
      })
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, response.data.id)

      if (isAdmin) {
        await queryClient.invalidateQueries({ queryKey: ['live-chat', 'inbox'] })
      } else {
        await queryClient.invalidateQueries({ queryKey: ['live-chat', 'thread'] })
      }
    } catch (error: unknown) {
      setInput(outgoing)
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }, [input, isAdmin, isSending, queryClient, resolvedThreadId])

  const handleCloseThread = useCallback(async () => {
    if (!resolvedThreadId) return
    await closeLiveChatThread(resolvedThreadId)
    if (isAdmin) {
      await queryClient.invalidateQueries({ queryKey: ['live-chat', 'inbox'] })
    } else {
      await queryClient.invalidateQueries({ queryKey: ['live-chat', 'thread'] })
    }
  }, [isAdmin, queryClient, resolvedThreadId])

  const selectThread = useCallback((thread: LiveChatThread) => {
    setActiveThreadId(thread.id)
    setMessages([])
    lastMessageIdRef.current = 0
  }, [])

  const inbox = inboxQuery.data?.data ?? []
  const totalUnread = inbox.reduce((sum, thread) => sum + (thread.unread_count ?? 0), 0)

  return {
    isAdmin,
    currentUserId,
    inbox,
    totalUnread,
    activeThread,
    activeThreadId: resolvedThreadId,
    messages,
    input,
    setInput,
    isSending,
    isClosed: activeThread?.status === 'closed',
    isLoading: isAdmin ? inboxQuery.isLoading : myThreadQuery.isLoading,
    scrollRef,
    handleSend,
    handleCloseThread,
    selectThread,
  }
}