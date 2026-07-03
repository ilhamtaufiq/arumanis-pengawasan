import { useEffect, useState } from 'react'
import { Headphones, Loader2, MessageCircle, Minus, Send, X } from 'lucide-react'
import type { AuthUser } from '@/lib/types'
import { Badge, Button, Input, cn } from '@/components/ui'
import { useLiveChat } from './useLiveChat'

const OPEN_STATE_KEY = 'ami_live_chat_open'

function LiveChatMessageList({
  messages,
  currentUserId,
  isAdminView = false,
}: {
  messages: ReturnType<typeof useLiveChat>['messages']
  currentUserId?: number | undefined
  isAdminView?: boolean
}) {
  if (messages.length === 0) {
    return (
      <div className="live-chat-empty">
        <Headphones size={36} />
        <p className="live-chat-empty__title">Hubungi Admin</p>
        <p className="live-chat-empty__text">
          Kirim pesan dan tim admin Arumanis akan membalas melalui live chat ini.
        </p>
      </div>
    )
  }

  return (
    <div className="live-chat-messages">
      {messages.map((message) => {
        const isMine = message.user_id === currentUserId
        return (
          <div key={message.id} className={cn('live-chat-message', isMine && 'live-chat-message--mine')}>
            <div className="live-chat-message__bubble">
              {!isMine ? (
                <div className="live-chat-message__author">
                  {isAdminView ? message.user?.name || 'Pengguna' : 'Admin'}
                </div>
              ) : null}
              <div>{message.message}</div>
              <div className="live-chat-message__time">
                {new Date(message.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function LiveChatWidget({ user }: { user: AuthUser }) {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem(OPEN_STATE_KEY) === 'true')
  const chat = useLiveChat(user, true)

  useEffect(() => {
    sessionStorage.setItem(OPEN_STATE_KEY, String(isOpen))
  }, [isOpen])

  const showUnreadBadge = !isOpen && chat.totalUnread > 0

  return (
    <div className="live-chat-root" aria-live="polite">
      {isOpen ? (
        <div className="live-chat-panel" role="dialog" aria-label="Live chat dengan admin">
          <div className="live-chat-panel__header">
            <div className="live-chat-panel__brand">
              <div className="live-chat-panel__icon">
                <Headphones size={18} />
              </div>
              <div>
                <div className="live-chat-panel__title">Live Chat Admin</div>
                <div className="live-chat-panel__subtitle">
                  {chat.isAdmin ? 'Balas pesan pengguna' : 'Tim admin Arumanis'}
                </div>
              </div>
            </div>
            <div className="live-chat-panel__actions">
              {chat.activeThreadId ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void chat.handleCloseThread()}>
                  Tutup
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Minimalkan live chat"
                onClick={() => setIsOpen(false)}
              >
                <Minus size={16} />
              </Button>
            </div>
          </div>

          {chat.isAdmin ? (
            <div className="live-chat-inbox">
              {chat.isLoading && chat.inbox.length === 0 ? (
                <div className="live-chat-loading">
                  <Loader2 className="neo-spinner" size={18} />
                </div>
              ) : chat.inbox.length === 0 ? (
                <p className="live-chat-inbox__empty">Belum ada percakapan masuk.</p>
              ) : (
                chat.inbox.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={cn(
                      'live-chat-inbox__item',
                      chat.activeThreadId === thread.id && 'live-chat-inbox__item--active',
                    )}
                    onClick={() => chat.selectThread(thread)}
                  >
                    <div className="live-chat-inbox__meta">
                      <div className="live-chat-inbox__name">
                        {thread.user?.name || `User #${thread.user_id}`}
                      </div>
                      <div className="live-chat-inbox__preview">
                        {thread.latest_message?.message || 'Belum ada pesan'}
                      </div>
                    </div>
                    {(thread.unread_count ?? 0) > 0 ? (
                      <Badge tone="danger">{thread.unread_count}</Badge>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}

          <div ref={chat.scrollRef} className="live-chat-panel__body">
            {chat.isLoading && !chat.activeThreadId ? (
              <div className="live-chat-loading">
                <Loader2 className="neo-spinner" size={20} />
              </div>
            ) : chat.isAdmin && !chat.activeThreadId ? (
              <p className="live-chat-inbox__empty">Pilih percakapan pengguna untuk mulai membalas.</p>
            ) : (
              <LiveChatMessageList
                messages={chat.messages}
                currentUserId={chat.currentUserId}
                isAdminView={chat.isAdmin}
              />
            )}
          </div>

          <div className="live-chat-panel__footer">
            {chat.isClosed ? (
              <p className="live-chat-panel__hint">Percakapan ditutup. Kirim pesan baru untuk membuka kembali.</p>
            ) : null}
            <form
              className="live-chat-form"
              onSubmit={(event) => {
                event.preventDefault()
                void chat.handleSend()
              }}
            >
              <Input
                value={chat.input}
                onChange={(event) => chat.setInput(event.target.value)}
                disabled={chat.isSending || !chat.activeThreadId}
                placeholder={
                  chat.isAdmin && !chat.activeThreadId
                    ? 'Pilih percakapan dulu...'
                    : chat.isAdmin
                      ? 'Balas pengguna...'
                      : 'Ketik pesan ke admin...'
                }
              />
              <Button
                type="submit"
                variant="success"
                size="sm"
                isLoading={chat.isSending}
                disabled={!chat.input.trim() || !chat.activeThreadId}
                aria-label="Kirim pesan"
              >
                <Send size={16} />
              </Button>
            </form>
            {!chat.isAdmin ? (
              <p className="live-chat-panel__hint">Butuh laporan detail? Gunakan menu Tiket.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        variant="success"
        size="lg"
        className="live-chat-fab"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Tutup live chat' : 'Buka live chat admin'}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        {showUnreadBadge ? <span className="live-chat-fab__badge">{chat.totalUnread > 9 ? '9+' : chat.totalUnread}</span> : null}
      </Button>
    </div>
  )
}