import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, addTiketComment, getTiketList } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { Badge, Button, EmptyState, Input, SectionHeader, Spinner, Surface, Textarea } from '@/components/ui'

export function TiketPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [message, setMessage] = useState('')
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const status = searchParams.get('status') || ''
  const kategori = searchParams.get('kategori') || ''
  const pekerjaanId = searchParams.get('pekerjaan_id') || ''
  const ticketId = searchParams.get('ticketId') || ''
  const search = searchParams.get('search') || ''

  const tiketQuery = useQuery({
    queryKey: ['tiket', 'list', { status, kategori, pekerjaanId }],
    queryFn: () =>
      getTiketList({
        per_page: 20,
        status: status || undefined,
        kategori: kategori || undefined,
        pekerjaan_id: pekerjaanId || undefined,
      }),
    retry: false,
  })

  const filteredTickets = useMemo(() => {
    const items = tiketQuery.data?.data ?? []
    if (!search) return items
    return items.filter((ticket) => {
      const haystack = `${ticket.subjek} ${ticket.deskripsi || ''} ${ticket.pekerjaan?.nama_paket || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
  }, [search, tiketQuery.data])

  const selectedTicket = filteredTickets.find((ticket) => `${ticket.id}` === ticketId) || filteredTickets[0] || null
  const tiketError = tiketQuery.error instanceof ApiError ? tiketQuery.error : null

  const commentMutation = useMutation({
    mutationFn: () => {
      if (!selectedTicket) throw new Error('Pilih tiket terlebih dahulu')
      return addTiketComment(selectedTicket.id, comment || message)
    },
    onSuccess: async () => {
      setComment('')
      setMessage('')
      await queryClient.invalidateQueries({ queryKey: ['tiket'] })
    },
  })

  return (
    <div className="stack">
      <SectionHeader
        title="Tiket"
        description="Filter isu lapangan, baca detail, dan tambahkan komentar jika diperlukan."
        action={
          <div className="toolbar">
            <Input
              className="toolbar-input"
              placeholder="Cari tiket"
              value={search}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('search', event.target.value)
                else next.delete('search')
                setSearchParams(next)
              }}
            />
            <Input
              className="toolbar-input toolbar-input--small"
              placeholder="Status"
              value={status}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('status', event.target.value)
                else next.delete('status')
                setSearchParams(next)
              }}
            />
          </div>
        }
      />

      <div className="content-grid content-grid--wide">
        <Surface className="panel">
          {tiketQuery.isPending ? (
            <div className="empty-state">
              <Spinner />
              <div className="empty-state-title">Memuat tiket...</div>
              <div className="empty-state-description">Mengambil daftar tiket dari server.</div>
            </div>
          ) : tiketQuery.isError ? (
            <EmptyState
              title={tiketError?.status === 401 ? 'Sesi tidak valid' : 'Gagal memuat tiket'}
              description={tiketError?.message || 'Terjadi kesalahan saat mengambil data tiket.'}
            />
          ) : filteredTickets.length ? (
            <div className="stack stack--dense">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className={`ticket-card ticket-card--button ${ticket.id === selectedTicket?.id ? 'ticket-card--selected' : ''}`}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams)
                    next.set('ticketId', String(ticket.id))
                    setSearchParams(next)
                  }}
                >
                  <div className="ticket-topline">
                    <strong>{ticket.subjek}</strong>
                    <Badge tone={ticket.status === 'closed' ? 'success' : ticket.status === 'pending' ? 'warning' : 'danger'}>
                      {ticket.status || 'open'}
                    </Badge>
                  </div>
                  <div className="ticket-meta">
                    <span>{ticket.pekerjaan?.nama_paket || '-'}</span>
                    <span>{ticket.prioritas || '-'}</span>
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Tidak ada tiket" description="Ubah filter untuk melihat tiket yang lain." />
          )}
        </Surface>

        <Surface className="panel">
          {selectedTicket ? (
            <div className="stack">
              <SectionHeader title={selectedTicket.subjek} description={selectedTicket.pekerjaan?.nama_paket || '-'} />
              <div className="detail-grid">
                <DetailRow label="Kategori" value={selectedTicket.kategori || '-'} />
                <DetailRow label="Prioritas" value={selectedTicket.prioritas || '-'} />
                <DetailRow label="Status" value={selectedTicket.status || '-'} />
                <DetailRow label="Dibuat" value={formatDateTime(selectedTicket.created_at)} />
              </div>
              <Surface className="ticket-body">
                {selectedTicket.deskripsi || 'Tidak ada deskripsi.'}
              </Surface>
              {selectedTicket.comments?.length ? (
                <div className="stack stack--dense">
                  {selectedTicket.comments.map((item) => (
                    <Surface key={item.id} className="comment-card">
                      <div className="comment-head">
                        <strong>{item.user?.name || 'User'}</strong>
                        <span>{formatDateTime(item.created_at)}</span>
                      </div>
                      <div>{item.message}</div>
                    </Surface>
                  ))}
                </div>
              ) : (
                <EmptyState title="Belum ada komentar" />
              )}

              <form
                className="stack stack--dense"
                onSubmit={(event) => {
                  event.preventDefault()
                  commentMutation.mutate()
                }}
              >
                <Textarea
                  rows={4}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Tambahkan komentar"
                  required
                />
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Atau ketik komentar singkat"
                />
                {commentMutation.error ? <div className="form-error">{commentMutation.error.message}</div> : null}
                <Button type="submit" isLoading={commentMutation.isPending}>
                  Simpan komentar
                </Button>
              </form>
            </div>
          ) : (
            <EmptyState title="Pilih tiket" description="Klik tiket di daftar untuk membuka detail." />
          )}
        </Surface>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
