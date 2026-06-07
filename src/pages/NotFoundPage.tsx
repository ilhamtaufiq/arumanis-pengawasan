import { Link } from 'react-router-dom'
import { Surface } from '@/components/ui'

export function NotFoundPage() {
  return (
    <Surface className="panel">
      <div className="empty-state-title">Halaman tidak ditemukan</div>
      <div className="empty-state-description">Periksa alamat atau kembali ke dashboard.</div>
      <Link className="neo-button neo-button--neutral" to="/">
        Kembali
      </Link>
    </Surface>
  )
}

