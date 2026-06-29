import { Link } from 'react-router-dom'
import { Home, ShieldAlert } from 'lucide-react'
import { ErrorPageHero } from '@/components/ErrorPageHero'
import { Surface } from '@/components/ui'

export function ForbiddenPage() {
  return (
    <div className="auth-page">
      <Surface className="auth-card error-page-card">
        <ErrorPageHero status={403} icon={<ShieldAlert size={28} />} iconClassName="error-page-icon--warn" />
        <div className="empty-state-title">Akses ditolak</div>
        <div className="empty-state-description">
          Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator jika diperlukan.
        </div>
        <div className="error-page-actions">
          <Link className="neo-button" to="/">
            <Home size={16} />
            <span>Ke dashboard</span>
          </Link>
        </div>
      </Surface>
    </div>
  )
}