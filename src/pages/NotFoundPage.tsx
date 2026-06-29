import { Link } from 'react-router-dom'
import { Home, SearchX } from 'lucide-react'
import { ErrorPageHero } from '@/components/ErrorPageHero'
import { Surface } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <Surface className="auth-card error-page-card">
        <ErrorPageHero status={404} icon={<SearchX size={28} />} />
        <div className="empty-state-title">Halaman tidak ditemukan</div>
        <div className="empty-state-description">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa URL atau kembali ke dashboard.
        </div>
        <div className="error-page-actions">
          <Link className="neo-button" to="/">
            <Home size={16} />
            <span>Ke dashboard</span>
          </Link>
          <a className="neo-button neo-button--neutral" href="/sign-in">
            Masuk via Arumanis
          </a>
        </div>
      </Surface>
    </div>
  )
}