import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, FileText } from 'lucide-react'
import { getPekerjaanList } from '@/lib/api'

/**
 * Command-like search (Alt+A): cari paket pekerjaan, klik → detail.
 * Ringan — tanpa dep cmdk; pakai modal-shell + fetch /pekerjaan?search=.
 */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['command-search', query],
    queryFn: () =>
      getPekerjaanList({
        search: query || undefined,
        per_page: 20,
        sort_by: 'created_at',
        sort_direction: 'desc',
      }),
    enabled: open && query.trim().length > 0,
    retry: false,
  })

  const results = useMemo(() => data?.data ?? [], [data])

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell command-search"
        role="dialog"
        aria-modal="true"
        aria-label="Cari paket pekerjaan"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-search-input">
          <Search size={16} className="command-search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Cari paket pekerjaan... (Esc untuk tutup)"
            className="command-search-field"
          />
        </div>

        <div className="command-search-list">
          {query.trim() === '' ? (
            <div className="command-search-empty">Ketik untuk mencari paket pekerjaan.</div>
          ) : isLoading ? (
            <div className="command-search-empty">
              <Loader2 size={16} className="command-search-spin" /> Mencari...
            </div>
          ) : results.length === 0 ? (
            <div className="command-search-empty">Tidak ada hasil.</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="command-search-item"
                onClick={() => {
                  onClose()
                  navigate(`/pekerjaan/${item.id}`)
                }}
              >
                <FileText size={15} className="command-search-item-icon" />
                <span className="command-search-item-copy">
                  <strong>{item.nama_paket}</strong>
                  {item.kode_rekening ? <small>{item.kode_rekening}</small> : null}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
